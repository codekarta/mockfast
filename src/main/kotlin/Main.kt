import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import io.javalin.Javalin
import io.javalin.core.JavalinConfig
import io.javalin.http.Context
import io.javalin.http.HandlerType
import io.javalin.http.NotFoundResponse
import io.javalin.http.UploadedFile
import org.eclipse.jetty.server.Request
import org.slf4j.LoggerFactory
import java.io.File
import java.io.FileWriter
import java.nio.file.FileSystems
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.nio.file.StandardWatchEventKinds.ENTRY_MODIFY

// Global variables
lateinit var rules: List<Rule>
val log = LoggerFactory.getLogger("MockFast")
var mockServerConfig = MockServerConfig()
val gson = Gson()

fun main(args: Array<String>) {
    val argsMap = buildArgsMap(args)
    val port = argsMap["-p"]?.toString()?.toIntOrNull() ?: 7070
    val ruleFile = argsMap["-r"]?.toString() ?: "rules.json"

    log.info("Using rule file: $ruleFile on port $port")

    // Start watching rules file for changes
    Thread { startWatchingRules(ruleFile) }.start()

    // Create mocks directory if it doesn't exist
    val mocksDir = File("mocks")
    if (!mocksDir.exists()) {
        mocksDir.mkdirs()
        log.info("Created mocks directory")
    }

    // Configuration UI server
    val configUi = Javalin.create { config: JavalinConfig ->
        config.addStaticFiles { staticFileConfig ->
            staticFileConfig.directory = "/dist"
            staticFileConfig.hostedPath = "/"
            staticFileConfig.precompress = false
            staticFileConfig.aliasCheck = null
        }
        // Enable CORS for development
        config.enableCorsForAllOrigins()
    }

    // API endpoints for rule management
    configUi.addHandler(HandlerType.POST, "/apply-config") { ctx ->
        val newMockServerConfig = gson.fromJson(ctx.body(), MockServerConfig::class.java)
        mockServerConfig = newMockServerConfig
        log.info("Configuration updated: delayEnabled=${mockServerConfig.delayEnabled}, delayMs=${mockServerConfig.delayMs}")
        ctx.status(200).result("Configuration applied")
    }

    configUi.addHandler(HandlerType.GET, "/api/config") { ctx ->
        ctx.json(mockServerConfig)
    }

    configUi.addHandler(HandlerType.GET, "/api/rules") { ctx ->
        try {
            ctx.json(rules)
        }
        catch (ex: Exception) {
            ctx.status(500).result("Error loading rules : " + ex.message)
        }
    }

    configUi.addHandler(HandlerType.POST, "/api/rules") { ctx ->
        try {
            val newRules = gson.fromJson<List<Rule>>(ctx.body(), object : TypeToken<List<Rule>>() {}.type)
            saveRulesToFile(ruleFile, newRules)
            log.info("Rules updated via API: ${newRules.size} rules")
            ctx.status(200).result("Rules saved successfully")
        } catch (e: Exception) {
            log.error("Error saving rules via API: ${e.message}", e)
            ctx.status(500).result("Error saving rules: ${e.message}")
        }
    }

    configUi.addHandler(HandlerType.POST, "/api/upload-response") { ctx ->
        try {
            val uploadedFile: UploadedFile = ctx.uploadedFile("file")
                ?: throw IllegalArgumentException("No file uploaded")

            val fileName = uploadedFile.filename

            // Save the file directly to mocks directory with original filename
            val mockFile = File("mocks", fileName)

            // Create parent directories if they don't exist
            mockFile.parentFile?.mkdirs()

            // Save the uploaded file
            uploadedFile.content.use { input ->
                mockFile.outputStream().use { output ->
                    input.copyTo(output)
                }
            }
            log.info("File uploaded: ${mockFile.absolutePath}")
            ctx.status(200).result("File uploaded successfully")
        } catch (e: Exception) {
            log.error("Error uploading file: ${e.message}", e)
            ctx.status(500).result("Error uploading file: ${e.message}")
        }
    }

    // Start configuration UI server
    configUi.start(7071)
    log.info("Configuration UI started on port 7071")

    // Main mock server
    val app = Javalin.create { config ->
        config.enableCorsForAllOrigins()
    }.start(port)

    getHandlers().forEach { handlerType ->
        app.addHandler(handlerType, "/*") { ctx -> handleRequest(ctx) }
    }

    log.info("Mock server started on port $port")
}

private fun buildArgsMap(args: Array<String>) =
    args.toList().chunked(2).associate { it[0] to it.getOrNull(1) }.toMutableMap()

fun processRules(ruleFile: String) {
    try {
        val file = File(ruleFile)
        if (!file.exists()) {
            // Create default rules file if it doesn't exist
            val defaultRules = listOf(
                Rule(
                    name = "Default Welcome",
                    method = "GET",
                    path = "/",
                    responseBody = "Welcome to MockFast!",
                    responseType = "text"
                )
            )
            saveRulesToFile(ruleFile, defaultRules)
            log.info("Created default rules file: $ruleFile")
        }

        val type = object : TypeToken<List<Rule>>() {}.type
        rules = gson.fromJson(Files.readString(Path.of(ruleFile)), type)
        log.info("Loaded ${rules.size} rules from $ruleFile")
    } catch (e: Exception) {
        log.error("Error loading rules file: ${e.message}", e)
        rules = emptyList()
    }
}

fun saveRulesToFile(ruleFile: String, rulesToSave: List<Rule>) {
    try {
        FileWriter(ruleFile).use { writer ->
            gson.toJson(rulesToSave, writer)
        }
        // Update in-memory rules
        rules = rulesToSave
        log.info("Saved ${rulesToSave.size} rules to $ruleFile")
    } catch (e: Exception) {
        log.error("Error saving rules to file: ${e.message}", e)
        throw e
    }
}

fun handleRequest(ctx: Context) {
    val path = (ctx.req as Request).originalURI
    val method = ctx.req.method
    val headers = ctx.headerMap()
    val body = ctx.body().replace("\\s+".toRegex(), "")

    // Filter only active rules
    val activeRules = rules.filter { it.active }

//    val matchedRules = activeRules.filter { rule ->
//        rule.method == method && rule.path == path &&
//                (rule.requestHeader?.all { headers[it.key] == it.value } ?: true) &&
//                (rule.requestBody?.replace("\\s+".toRegex(), "") == body || rule.requestBody == null)
//    }
    val matchedRules = activeRules.filter { rule ->
        val pathWithoutQuery = path.split("?")[0]
        rule.method == method &&  pathWithoutQuery.matches(rule.path.toRegex()) &&
                (rule.requestHeader?.all { headers[it.key] == it.value } ?: true) &&
                (rule.requestBody?.replace("\\s+".toRegex(), "") == body || rule.requestBody == null)
    }


    val ruleToUse = matchedRules.firstOrNull()
        ?: throw NotFoundResponse("No matching rule for $method $path")

    log.info("Matched Rule: ${ruleToUse.name}")

    // Apply delay - check rule-specific delay first, then global delay
    val delayToApply = when {
        ruleToUse.delayOverride -> {
            log.info("Applying rule-specific delay: ${ruleToUse.delayMs}ms")
            ruleToUse.delayMs
        }
        mockServerConfig.delayEnabled -> {
            log.info("Applying global delay: ${mockServerConfig.delayMs}ms")
            mockServerConfig.delayMs
        }
        else -> 0L
    }

    if (delayToApply > 0) {
        Thread.sleep(delayToApply)
    }

    // Apply response headers
    ruleToUse.responseHeader?.forEach { (k, v) -> ctx.header(k, v) }
    val code = ruleToUse.responseCode.takeIf { it != 0 } ?: 200

    // Send response based on type
    when {
        ruleToUse.responseType == "file" && !ruleToUse.responseFile.isNullOrEmpty() -> {
            sendFileResponse(ctx, ruleToUse.responseFile, code)
        }
        else -> {
            sendTypedResponse(ctx, ruleToUse.responseBody, ruleToUse.responseType, code)
        }
    }
}

fun sendTypedResponse(ctx: Context, responseBody: String, responseType: String, responseCode: Int) {
    // Set content type based on response type if not already set in headers
    val contentType = when (responseType.lowercase()) {
        "json" -> "application/json"
        "html" -> "text/html"
        "xml" -> "application/xml"
        "text" -> "text/plain"
        else -> "text/plain"
    }

    // Only set content-type if it wasn't already set in the rule's response headers
    if (ctx.header("Content-Type") == null) {
        ctx.header("Content-Type", contentType)
    }

    ctx.result(responseBody).status(responseCode)
}

fun sendFileResponse(ctx: Context, filePath: String, responseCode: Int) {
    try {
        val file = File(filePath)
        if (!file.exists()) {
            log.error("Response file not found: $filePath")
            ctx.status(404).result("Response file not found: $filePath")
            return
        }

        val extension = file.extension.lowercase()

        // For binary files, read as bytes
        val isBinaryFile = listOf("jpg", "jpeg", "png", "gif", "pdf", "zip", "mp4", "mp3", "wav").contains(extension)

        if (isBinaryFile) {
            val bytes = file.readBytes()
            val contentType = when (extension) {
                "jpg", "jpeg" -> "image/jpeg"
                "png" -> "image/png"
                "gif" -> "image/gif"
                "pdf" -> "application/pdf"
                "zip" -> "application/zip"
                "mp4" -> "video/mp4"
                "mp3" -> "audio/mpeg"
                "wav" -> "audio/wav"
                else -> "application/octet-stream"
            }

            ctx.header("Content-Type", contentType)
            ctx.result(bytes).status(responseCode)
        } else {
            // For text files, read as string
            val text = file.readText()
            val contentType = when (extension) {
                "json" -> "application/json"
                "htm", "html" -> "text/html"
                "xml" -> "application/xml"
                "txt" -> "text/plain"
                "css" -> "text/css"
                "js" -> "application/javascript"
                else -> "text/plain"
            }

            ctx.header("Content-Type", contentType)
            ctx.result(text).status(responseCode)
        }

        log.info("Served file: $filePath (${file.length()} bytes)")

    } catch (e: Exception) {
        log.error("Error reading response file: ${e.message}", e)
        ctx.status(500).result("Error reading response file: ${e.message}")
    }
}

fun getHandlers() = listOf(
    HandlerType.GET,
    HandlerType.POST,
    HandlerType.PUT,
    HandlerType.DELETE,
    HandlerType.PATCH,
    HandlerType.OPTIONS // Add OPTIONS for CORS
)

fun startWatchingRules(file: String) {
    processRules(file)
    val watcher = FileSystems.getDefault().newWatchService()
    val watchDir = Paths.get(".")
    watchDir.register(watcher, ENTRY_MODIFY)

    while (true) {
        try {
            val key = watcher.take()
            key.pollEvents().forEach { event ->
                if (event.kind() == ENTRY_MODIFY && file.contains(event.context().toString())) {
                    log.info("Rules file modified: $file. Reloading...")
                    processRules(file)
                }
            }
            key.reset()
        } catch (e: Exception) {
            log.error("Error watching rules file: ${e.message}", e)
            Thread.sleep(1000) // Wait before retrying
        }
    }
}