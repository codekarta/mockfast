class Rule(
    val name: String,
    val method: String,
    val path: String,
    val requestHeader: Map<String, String>?,
    val responseBody: String,
    val responseFile: String?,
    val responseHeader: Map<String, String>?,
    val responseCode: Int
)