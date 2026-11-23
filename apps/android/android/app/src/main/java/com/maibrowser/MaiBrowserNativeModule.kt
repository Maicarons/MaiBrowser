package com.maibrowser

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Handler
import android.os.Looper
import com.lynx.jsbridge.LynxMethod
import com.lynx.jsbridge.LynxModule
import com.lynx.react.bridge.Callback
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
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
        private const val USER_AGENT = "MaiBrowser/0.1.2 (Android)"
    }
}
