
data class Rule(
    val name: String,
    val method: String,
    val path: String,
    val requestHeader: Map<String, String>? = null,
    val responseBody: String = "",
    val responseFile: String? = null,
    val responseHeader: Map<String, String>? = null,
    val responseCode: Int = 200,
    val requestBody: String = "",
    val active: Boolean = true,
    val responseType: String = "text",
    val delayMs: Long = 0 // Delay in milliseconds for this rule (default: 0 = no delay)
)
