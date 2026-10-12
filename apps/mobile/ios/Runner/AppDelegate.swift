import Flutter
import UIKit

@main
@objc class AppDelegate: FlutterAppDelegate {
  private var eventSink: FlutterEventSink?
  
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
        self?.observeScreenCapture()
        result(nil)
      case "disableSecureView":
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
  
  private func observeScreenCapture() {
    if UIScreen.main.isCaptured {
      eventSink?("screen_record")
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
