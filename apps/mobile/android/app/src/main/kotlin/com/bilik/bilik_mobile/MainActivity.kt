package com.bilik.bilik_mobile

import android.app.ActivityManager
import android.content.res.Configuration
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.WindowManager
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.EventChannel
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val CHANNEL = "com.bilik/exam_guard"
    private val EVENT_CHANNEL = "com.bilik/exam_guard_events"
    private var eventSink: EventChannel.EventSink? = null
    private var aktif = false
    private var dipaku = false
    // Pinning baru dianggap terpasang setelah siswa menekan "Mengerti" di dialog sistem.
    private var sudahTerpin = false
    private var laporTerakhir = 0L
    // Tenggang setelah pinning dinyalakan: dialog pinning sistem ("MENGERTI")
    // sementara memindah fokus app, jangan dihitung pelanggaran.
    private var graceUntil = 0L
    private val handler = Handler(Looper.getMainLooper())

    // Pemantau: setiap 1 dtk cek apakah screen pinning masih aktif.
    // Screen pinning berstatus LOCK_TASK_MODE_PINNED (bukan LOCKED, itu mode kios MDM), jadi
    // yang dilaporkan hanya perpindahan dari terpasang ke NONE. Selama dialog "Mengerti" belum
    // ditekan statusnya masih NONE, dan itu bukan pelanggaran.
    private val pemantau = object : Runnable {
        override fun run() {
            if (aktif && dipaku) {
                if (lockTaskState() != ActivityManager.LOCK_TASK_MODE_NONE) {
                    sudahTerpin = true
                } else if (sudahTerpin && System.currentTimeMillis() >= graceUntil) {
                    dipaku = false
                    sudahTerpin = false
                    lapor("pinning_released")
                }
            }
            if (aktif) handler.postDelayed(this, 1000)
        }
    }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "canPin" -> result.success(lockTaskState() == ActivityManager.LOCK_TASK_MODE_NONE)
                "setActive" -> {
                    aktif = call.argument<Boolean>("aktif") ?: false
                    if (aktif) graceUntil = System.currentTimeMillis() + 4000
                    result.success(null)
                }
                "startLock" -> {
                    startLockMode()
                    result.success(dipaku)
                }
                "stopLock" -> {
                    stopLockMode()
                    result.success(null)
                }
                else -> result.notImplemented()
            }
        }

        EventChannel(flutterEngine.dartExecutor.binaryMessenger, EVENT_CHANNEL).setStreamHandler(
            object : EventChannel.StreamHandler {
                override fun onListen(args: Any?, sink: EventChannel.EventSink?) {
                    eventSink = sink
                }

                override fun onCancel(args: Any?) {
                    eventSink = null
                }
            }
        )
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Blokir screenshot/thumbnail: layar jadi hitam di daftar app terakhir.
        window.setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE)
    }

    // Murid keluar dari app saat ujian (tombol Home, app lain, dsb).
    override fun onPause() {
        super.onPause()
        if (aktif && System.currentTimeMillis() >= graceUntil) lapor("app_inactive")
    }

    // Layar dipecah (split-screen) saat ujian.
    override fun onMultiWindowModeChanged(isInMultiWindowMode: Boolean, newConfig: Configuration) {
        super.onMultiWindowModeChanged(isInMultiWindowMode, newConfig)
        if (aktif && isInMultiWindowMode) lapor("multi_window")
    }

    // Lapor maksimal sekali per 2 detik agar tidak dobel.
    private fun lapor(jenis: String) {
        val sekarang = System.currentTimeMillis()
        if (sekarang < graceUntil) return
        if (sekarang - laporTerakhir < 2000) return
        laporTerakhir = sekarang
        eventSink?.success(jenis)
    }

    private fun lockTaskState(): Int {
        val am = getSystemService(ACTIVITY_SERVICE) as ActivityManager
        return am.lockTaskModeState
    }

    private fun startLockMode() {
        // Dialog pinning sistem muncul sekali saat pertama; beri tenggang.
        graceUntil = System.currentTimeMillis() + 4000
        try {
            startLockTask()
        } catch (_: Exception) {
            // Perangkat mungkin belum mengizinkan screen pinning.
        }
        dipaku = true
        sudahTerpin = false
        handler.removeCallbacks(pemantau)
        handler.postDelayed(pemantau, 1000)
    }

    private fun stopLockMode() {
        dipaku = false
        sudahTerpin = false
        handler.removeCallbacks(pemantau)
        try {
            stopLockTask()
        } catch (_: Exception) {
        }
    }

    override fun onDestroy() {
        handler.removeCallbacks(pemantau)
        super.onDestroy()
    }
}
