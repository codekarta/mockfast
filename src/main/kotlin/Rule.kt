
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
    val responseType: String = "text", // New field for response type
    val delayOverride: Boolean = false, // New field for delay override
    val delayMs: Long = 0 // New field for rule-specific delay
)
