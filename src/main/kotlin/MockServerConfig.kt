data class MockServerConfig(
    val delayEnabled: Boolean = false,
    val delayMs: Long = 0,
    val useHttps: Boolean = false,
    val useSelfSigned: Boolean = true,
    val keyFile: String = "",
    val certFile: String = ""
)