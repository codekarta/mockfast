import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import io.javalin.Javalin
import io.javalin.core.JavalinConfig
import io.javalin.http.Context
import io.javalin.http.HandlerType
import io.javalin.http.NotFoundResponse
import org.eclipse.jetty.server.Request
import org.slf4j.LoggerFactory
import java.io.File
import java.io.FileReader
import java.nio.file.FileSystems
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.nio.file.StandardWatchEventKinds.ENTRY_MODIFY

lateinit var rules: List<Rule>
val log = LoggerFactory.getLogger("MockFast")
var mockServerConfig = MockServerConfig()


/**
 * TODO: documentations on github
 * take rule file path
 * support for binary and images
 * make it popular
 * unit testing integration
 * take port number from outside
 */

fun main(args: Array<String>) {
    val argsMap = buildArgsMap(args)
    val port = argsMap["-p"]?.toString()?.toIntOrNull() ?: 7070
    val ruleFile = argsMap["-r"]?.toString() ?: "rules.json"

    log.info("Using rule file: $ruleFile on port $port")

    Thread { startWatchingRules(ruleFile) }.start()

    val configUi = Javalin.create { config: JavalinConfig ->
        config.addStaticFiles { staticFileConfig ->
            staticFileConfig.directory = "/dist" // folder path
            staticFileConfig.hostedPath = "/" // URL path
            staticFileConfig.precompress = false
            staticFileConfig.aliasCheck = null
        }
    }

    configUi.addHandler(HandlerType.POST, "/apply-config") { ctx ->
        val newMockServerConfig = Gson().fromJson(ctx.body(), MockServerConfig::class.java)
        mockServerConfig = newMockServerConfig
        ctx.status(200)
    }

    configUi.start(7071)

    val app = Javalin.create().start(port)
    getHandlers().forEach { handlerType ->
        app.addHandler(handlerType, "/*") { ctx -> handleRequest(ctx) }
    }
}

private fun buildArgsMap(args: Array<String>) =
    args.toList().chunked(2).associate { it[0] to it.getOrNull(1) }.toMutableMap()

fun processRules(ruleFile: String) {
    try {
        val gson = Gson()
        val type = object : TypeToken<List<Rule>>() {}.type
        rules = gson.fromJson(Files.readString(Path.of(ruleFile)), type)
        log.info("Loaded ${rules.size} rules from $ruleFile")
    } catch (e: Exception) {
        log.error("Error loading rules file: ${e.message}", e)
    }
}

fun handleRequest(ctx: Context) {
    val path = (ctx.req as Request).originalURI
    val method = ctx.req.method
    val headers = ctx.headerMap()
    val body = ctx.body().replace("\\s+".toRegex(), "")

    val matchedRules = rules.filter { rule ->
        rule.method == method && rule.path == path &&
                (rule.requestHeader?.all { headers[it.key] == it.value } ?: true) &&
                (rule.requestBody?.toString()?.replace("\\s+".toRegex(), "") == body || rule.requestBody == null)
    }

    val ruleToUse = matchedRules.firstOrNull()
        ?: throw NotFoundResponse("No matching rule for $method $path")

    log.info("Matched Rule: ${ruleToUse.name}")

    ruleToUse.responseHeader?.forEach { (k, v) -> ctx.header(k, v) }
    val code = ruleToUse.responseCode.takeIf { it != 0 } ?: 200

    if (mockServerConfig.delayEnabled && mockServerConfig.delayMs > 0) {
        log.info("Delaying response by ${mockServerConfig.delayMs}ms")
        Thread.sleep(mockServerConfig.delayMs)
    }
    if (ruleToUse.responseFile != null) {
        sendFileResponse(ctx, ruleToUse.responseFile, code)
    } else {
        ctx.result(ruleToUse.responseBody).status(code)
    }
}

fun sendFileResponse(ctx: Context, filePath: String, responseCode: Int) {
    val extension = File(filePath).extension.lowercase()
    val text = FileReader(filePath).use { it.readText() }
    when (extension) {
        "json" -> ctx.json(text).status(responseCode)
        "htm", "html" -> ctx.html(text).status(responseCode)
        else -> ctx.result(text).status(responseCode)
        // TODO: Add support for images, binaries, zip, etc.
    }
}

fun getHandlers() = listOf(
    HandlerType.GET,
    HandlerType.POST,
    HandlerType.PUT,
    HandlerType.DELETE,
    HandlerType.PATCH
)

fun startWatchingRules(file: String) {
    processRules(file)
    val watcher = FileSystems.getDefault().newWatchService()
    val watchDir = Paths.get(".")
    watchDir.register(watcher, ENTRY_MODIFY)

    while (true) {
        val key = watcher.take()
        key.pollEvents().forEach { event ->
            if (event.kind() == ENTRY_MODIFY && file.contains(event.context().toString())) {
                log.info("Rules file modified: $file. Reloading...")
                processRules(file)
            }
        }
        key.reset()
    }
}
