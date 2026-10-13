import Flutter
import UIKit

@main
@objc class AppDelegate: FlutterAppDelegate {
  private var eventSink: FlutterEventSink?
  private var observerCapture: NSObjectProtocol?
  private var layarAman: UIView?

  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    GeneratedPluginRegistrant.register(with: self)

    let controller = window?.rootViewController as! FlutterViewController
    let methodChannel = FlutterMethodChannel(name: "com.bilik/exam_guard", binaryMessenger: controller.binaryMessenger)
    let eventChannel = FlutterEventChannel(name: "com.bilik/exam_guard_events", binaryMessenger: controller.binaryMessenger)

    methodChannel.setMethodCallHandler { [weak self] (call, result) in
      switch call.method {
      case "isGuidedAccessEnabled":
        result(UIAccessibility.isGuidedAccessEnabled)
      case "enableSecureView":
        self?.mulaiAmanLayar()
        result(nil)
      case "disableSecureView":
        self?.hentikanAmanLayar()
        result(nil)
      case "setActive":
        result(nil)
      case "canPin":
        result(UIAccessibility.isGuidedAccessEnabled)
      case "startLock":
        result(nil)
      case "stopLock":
        result(nil)
      default:
        result(FlutterMethodNotImplemented)
      }
    }

    eventChannel.setStreamHandler(StreamHandler { [weak self] sink in
      self?.eventSink = sink
    })

    NotificationCenter.default.addObserver(
      self,
      selector: #selector(screenshotTaken),
      name: UIApplication.userDidTakeScreenshotNotification,
      object: nil
    )

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  @objc private func screenshotTaken() {
    eventSink?("screenshot")
  }

  // iOS tak bisa memblokir screenshot/rekam layar; kita tutup layar dengan blur
  // saat terdeteksi direkam, dan laporkan kejadiannya.
  private func mulaiAmanLayar() {
    perbaruiAmanLayar()
    observerCapture = NotificationCenter.default.addObserver(
      forName: UIScreen.capturedDidChangeNotification,
      object: nil,
      queue: .main
    ) { [weak self] _ in
      self?.perbaruiAmanLayar()
    }
  }

  private func hentikanAmanLayar() {
    if let observer = observerCapture {
      NotificationCenter.default.removeObserver(observer)
      observerCapture = nil
    }
    layarAman?.removeFromSuperview()
    layarAman = nil
  }

  private func perbaruiAmanLayar() {
    guard let w = window else { return }
    if UIScreen.main.isCaptured {
      eventSink?("screen_record")
      if layarAman == nil {
        let blur = UIVisualEffectView(effect: UIBlurEffect(style: .dark))
        blur.frame = w.bounds
        blur.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        w.addSubview(blur)
        layarAman = blur
      }
    } else {
      layarAman?.removeFromSuperview()
      layarAman = nil
    }
  }

  override func applicationWillResignActive(_ application: UIApplication) {
    eventSink?("app_inactive")
  }
}

class StreamHandler: NSObject, FlutterStreamHandler {
  private let onListenCallback: (FlutterEventSink?) -> Void

  init(onListen: @escaping (FlutterEventSink?) -> Void) {
    self.onListenCallback = onListen
  }

  func onListen(withArguments arguments: Any?, eventSink events: @escaping FlutterEventSink) -> FlutterError? {
    onListenCallback(events)
    return nil
  }

  func onCancel(withArguments arguments: Any?) -> FlutterError? {
    return nil
  }
}
