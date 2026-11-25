package com.maibrowser

import android.app.DownloadManager
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Environment
import android.os.Handler
import android.os.Looper
import com.lynx.jsbridge.LynxMethod
import com.lynx.jsbridge.LynxModule
import com.lynx.react.bridge.Callback
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.net.URLDecoder
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

class MaiBrowserNativeModule(context: Context) : LynxModule(context) {
    private val mainHandler = Handler(Looper.getMainLooper())
    private val ioExecutor = Executors.newSingleThreadExecutor()
    private val client = OkHttpClient.Builder()
        .connectTimeout(20, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    private fun stateFile(): File = File(mContext.filesDir, "maibrowser-state.json")

    private fun backupFile(): File = File(mContext.filesDir, "maibrowser-state.json.bak")

    private fun readValidState(file: File): String? {
        return try {
            if (!file.isFile) return null
            val text = file.readText(Charsets.UTF_8)
            if (text.isBlank()) return null
            JSONObject(text)
            text
        } catch (error: Throwable) {
            null
        }
    }

    private fun reply(callback: Callback, payload: String) {
        mainHandler.post { callback.invoke(payload) }
    }

    @LynxMethod
    fun loadState(callback: Callback) {
        ioExecutor.execute {
            val text = try {
                readValidState(stateFile()) ?: readValidState(backupFile()) ?: ""
            } catch (error: Throwable) {
                ""
            }
            reply(callback, text)
        }
    }

    @LynxMethod
    fun saveState(json: String, callback: Callback) {
        ioExecutor.execute {
            try {
                JSONObject(json)
                val target = stateFile()
                val temp = File(mContext.filesDir, "maibrowser-state.json.tmp")
                FileOutputStream(temp).use { output ->
                    output.write(json.toByteArray(Charsets.UTF_8))
                    output.fd.sync()
                }
                if (target.exists() && readValidState(target) != null) {
                    target.copyTo(backupFile(), overwrite = true)
                }
                if (target.exists() && !target.delete()) {
                    throw IllegalStateException("Cannot replace state file")
                }
                if (!temp.renameTo(target)) {
                    temp.copyTo(target, overwrite = true)
                    temp.delete()
                }
                reply(callback, "true")
            } catch (error: Throwable) {
                reply(callback, "false")
            }
        }
    }

    @LynxMethod
    fun fetchText(url: String, callback: Callback) {
        Thread {
            val result = try {
                val request = Request.Builder().url(url).header("User-Agent", USER_AGENT).build()
                client.newCall(request).execute().use { response ->
                    val body = response.body?.string() ?: ""
                    if (!response.isSuccessful) {
                        JSONObject().put("ok", false).put("error", "HTTP ${response.code}").toString()
                    } else {
                        JSONObject().put("ok", true).put("data", body).toString()
                    }
                }
            } catch (error: Throwable) {
                JSONObject().put("ok", false).put("error", error.message ?: "Network error").toString()
            }
            reply(callback, result)
        }.start()
    }

    private fun downloadName(url: String): String {
        val segment = try {
            Uri.parse(url).lastPathSegment ?: ""
        } catch (error: Throwable) {
            ""
        }
        val decoded = try {
            URLDecoder.decode(segment, "UTF-8")
        } catch (error: Throwable) {
            segment
        }
        val cleaned = decoded
            .map { if (it.code < 32 || "\\/:*?\"<>|".contains(it)) '_' else it }
            .joinToString("")
            .trim()
            .trimStart('.')
        if (cleaned.isBlank()) return "download-${System.currentTimeMillis()}.bin"
        if (cleaned.length <= 120) return cleaned
        val extension = cleaned.substringAfterLast('.', "")
        val stem = cleaned.substringBeforeLast('.', cleaned).take(100)
        return if (extension.isBlank()) stem else "$stem.$extension"
    }

    @LynxMethod
    fun downloadsStart(json: String, callback: Callback) {
        ioExecutor.execute {
            val result = try {
                val input = JSONObject(json)
                val url = input.optString("url")
                if (!url.startsWith("http://") && !url.startsWith("https://")) {
                    throw IllegalArgumentException("Only http(s) download URLs are supported")
                }
                val requested = input.optString("fileName").trim()
                val fileName = downloadName(requested.ifBlank { url })
                val manager = mContext.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
                val request = DownloadManager.Request(Uri.parse(url))
                    .setTitle(fileName)
                    .setDescription("MaiBrowser")
                    .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                    .setAllowedOverMetered(true)
                    .setAllowedOverRoaming(false)
                    .addRequestHeader("User-Agent", USER_AGENT)
                val mime = input.optString("mime")
                if (mime.isNotBlank()) request.setMimeType(mime)
                try {
                    request.setDestinationInExternalPublicDir(
                        Environment.DIRECTORY_DOWNLOADS,
                        "MaiBrowser/$fileName",
                    )
                } catch (error: Throwable) {
                    request.setDestinationInExternalFilesDir(
                        mContext,
                        Environment.DIRECTORY_DOWNLOADS,
                        fileName,
                    )
                }
                val id = manager.enqueue(request)
                JSONObject()
                    .put("ok", true)
                    .put("id", id.toString())
                    .put("fileName", fileName)
            } catch (error: Throwable) {
                JSONObject()
                    .put("ok", false)
                    .put("error", error.message ?: "Download could not be started")
            }
            reply(callback, result.toString())
        }
    }

    @LynxMethod
    fun downloadsSync(json: String, callback: Callback) {
        ioExecutor.execute {
            val result = JSONObject()
            try {
                val ids = JSONArray(json)
                val values = LongArray(ids.length()) { ids.getLong(it) }
                if (values.isNotEmpty()) {
                    val manager = mContext.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
                    val query = DownloadManager.Query().setFilterById(*values)
                    manager.query(query).use { cursor ->
                        while (cursor.moveToNext()) {
                            val idIndex = cursor.getColumnIndex(DownloadManager.COLUMN_ID)
                            val statusIndex = cursor.getColumnIndex(DownloadManager.COLUMN_STATUS)
                            val receivedIndex = cursor.getColumnIndex(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR)
                            val totalIndex = cursor.getColumnIndex(DownloadManager.COLUMN_TOTAL_SIZE_BYTES)
                            val uriIndex = cursor.getColumnIndex(DownloadManager.COLUMN_LOCAL_URI)
                            val mediaTypeIndex = cursor.getColumnIndex(DownloadManager.COLUMN_MEDIA_TYPE)
                            val reasonIndex = cursor.getColumnIndex(DownloadManager.COLUMN_REASON)
                            if (idIndex < 0 || statusIndex < 0) continue
                            val id = cursor.getLong(idIndex)
                            val status = cursor.getInt(statusIndex)
                            val state = when (status) {
                                DownloadManager.STATUS_SUCCESSFUL -> "completed"
                                DownloadManager.STATUS_FAILED -> "failed"
                                DownloadManager.STATUS_PAUSED -> "paused"
                                DownloadManager.STATUS_PENDING -> "queued"
                                else -> "downloading"
                            }
                            val total = if (totalIndex >= 0) cursor.getLong(totalIndex) else 0L
                            val received = if (receivedIndex >= 0) cursor.getLong(receivedIndex) else 0L
                            val uri = if (uriIndex >= 0) cursor.getString(uriIndex) ?: "" else ""
                            val mediaType = if (mediaTypeIndex >= 0) cursor.getString(mediaTypeIndex) ?: "" else ""
                            val contentUri = if (status == DownloadManager.STATUS_SUCCESSFUL) {
                                runCatching { manager.getUriForDownloadedFile(id)?.toString() }
                                    .getOrNull() ?: uri
                            } else {
                                uri
                            }
                            val reason = if (reasonIndex >= 0) cursor.getInt(reasonIndex) else 0
                            val error = if (status == DownloadManager.STATUS_FAILED) {
                                "Download failed (reason $reason)"
                            } else {
                                ""
                            }
                            result.put(
                                id.toString(),
                                JSONObject()
                                    .put("state", state)
                                    .put("receivedBytes", received)
                                    .put("totalBytes", if (total > 0) total else 0)
                                    .put("filePath", contentUri)
                                    .put("mime", mediaType)
                                    .put("error", error),
                            )
                        }
                    }
                }
            } catch (error: Throwable) {
                // return whatever was collected so the caller can keep last-known state
            }
            reply(callback, result.toString())
        }
    }

    @LynxMethod
    fun downloadsCancel(id: String, callback: Callback) {
        ioExecutor.execute {
            val removed = try {
                val manager = mContext.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
                manager.remove(id.toLong()) > 0
            } catch (error: Throwable) {
                false
            }
            reply(callback, if (removed) "true" else "false")
        }
    }

    @LynxMethod
    fun openDownloadedFile(uri: String, mime: String, callback: Callback) {
        try {
            val intent = Intent(Intent.ACTION_VIEW)
            intent.setDataAndType(Uri.parse(uri), mime.ifBlank { "*/*" })
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            mContext.startActivity(intent)
            reply(callback, "true")
        } catch (error: Throwable) {
            reply(callback, "false")
        }
    }

    @LynxMethod
    fun openExternal(url: String, callback: Callback) {
        try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            mContext.startActivity(intent)
            reply(callback, "true")
        } catch (error: Throwable) {
            reply(callback, "false")
        }
    }

    @LynxMethod
    fun writeClipboard(text: String) {
        val clipboard = mContext.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        clipboard.setPrimaryClip(ClipData.newPlainText("MaiBrowser", text))
    }

    @LynxMethod
    fun readClipboard(callback: Callback) {
        try {
            val clipboard = mContext.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            val clip = clipboard.primaryClip
            val text = if (clip != null && clip.itemCount > 0) {
                clip.getItemAt(0).coerceToText(mContext).toString()
            } else {
                ""
            }
            reply(callback, text)
        } catch (error: Throwable) {
            reply(callback, "")
        }
    }

    companion object {
        private const val USER_AGENT = "MaiBrowser/0.2.0 (Android)"
    }
}
