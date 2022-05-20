import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import io.javalin.Javalin
import io.javalin.http.Context
import io.javalin.http.HandlerType
import io.javalin.http.NotFoundResponse
import org.eclipse.jetty.server.Request
import java.io.File
import java.io.FileReader
import java.nio.file.FileSystems
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.nio.file.StandardWatchEventKinds.*

lateinit var rules: List<Rule>

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
    val port = argsMap["-p"]?.toString()?.toInt() ?: 7070
    val ruleFile = argsMap["-r"]?.toString() ?: "rules.json"

    Thread { startWatchingRules(ruleFile) }.start()
    val app = Javalin.create().start(port)
    getHandlers().forEach {
        app.addHandler(it, "/*") { ctx ->
            handler(ctx)
        }
    }
}

private fun buildArgsMap(args: Array<String>): MutableMap<String, Any?> {
    val argsMap = mutableMapOf<String, Any?>()
    var key = ""
    for (arg in args) {
        if (key == "") {
            key = arg
            argsMap.put(key, null)
        } else {
            argsMap[key] = arg
            key = ""
        }
    }
    return argsMap
}

fun processRules(ruleFile: String) {
    try {
        val gson = Gson()
        val type = object : TypeToken<List<Rule>>() {}.type
        rules = gson.fromJson(Files.readString(Path.of(ruleFile)), type) as List<Rule>
    } catch (e: Exception) {
        println("Error Processing Rules file: ${e.message}")
    }
}

fun handler(ctx: Context) {
    val path = (ctx.req as Request).originalURI
    val method = ctx.req.method
    val headers = ctx.headerMap()

    val ruleList = rules.filter { it.method == method }.filter { it.path == path }

    val mutableRuleList: MutableList<Rule> = ruleList.toMutableList()

    val filteredRulesList = mutableListOf<Rule>()

    for (rule in ruleList) {
        if (rule.requestHeader != null) {
            var matching = true
            loop@ for (key in rule.requestHeader.keys) {
                if (!headers.containsKey(key) || !headers[key].equals(rule.requestHeader[key].toString())) {
                    mutableRuleList.remove(rule)
                    matching = false
                    break@loop
                }
            }
            if (matching) {
                filteredRulesList.add(rule)
                mutableRuleList.remove(rule)
            }
        }
    }

    val finalRuleToUse = if (filteredRulesList.size > 0) {
        filteredRulesList[0]
    } else if (mutableRuleList.size > 0) {
        filteredRulesList.clear()
        mutableRuleList[0]
    } else {
        throw NotFoundResponse()
    }

    println("Found Matching Rule: ${finalRuleToUse.name}")

    val responseCode = if(finalRuleToUse.responseCode == 0)  200 else  finalRuleToUse.responseCode
    finalRuleToUse.responseHeader?.forEach { (k, v) ->  ctx.header(k,v)}

    if(finalRuleToUse.responseFile != null ) {
        processFile(ctx, finalRuleToUse.responseFile, responseCode)
    }else {
        ctx.result(finalRuleToUse.responseBody).status(responseCode)
    }
}

fun processFile(ctx: Context, filePath: String, responseCode: Int): String {
    val extension = File(filePath).extension.lowercase()
    val text = FileReader(filePath).readText()
    when (extension) {
        "json" -> ctx.json(text).status(responseCode)
        "htm", "html" -> ctx.html(text).status(responseCode)
        else -> ctx.result(text).status(responseCode)
        //TODO: add for images and binary, zip etc
    }
    return ""
}

fun getHandlers() = arrayListOf(
    HandlerType.GET,
    HandlerType.POST,
    HandlerType.PUT,
    HandlerType.DELETE,
    HandlerType.PATCH
)

fun startWatchingRules(file: String) {
    processRules(file)
    val watcher = FileSystems.getDefault().newWatchService()
    val logDir = Paths.get("./")
    logDir.register(watcher, ENTRY_MODIFY)
    while (true) {
        Thread.sleep(1000)
        val key = watcher.take()
        for (event in key.pollEvents()) {
            val kind = event.kind()
            if (ENTRY_MODIFY == kind) {
                if (file.contains(event.context().toString())) {
                    println("updating rules file $file")
                    processRules(file)
                }
            }
        }
        key.reset()
        Thread.yield()
    }
}