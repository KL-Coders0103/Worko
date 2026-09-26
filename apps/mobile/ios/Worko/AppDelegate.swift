import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
@main
class AppDelegate:RCTAppDelegate{override func application(_ application:UIApplication,didFinishLaunchingWithOptions launchOptions:[UIApplication.LaunchOptionsKey:Any]?=nil)->Bool{moduleName="Worko";dependencyProvider=RCTAppDependencyProvider();initialProps=[:];return super.application(application,didFinishLaunchingWithOptions:launchOptions)}override func sourceURL(for bridge:RCTBridge)->URL?{bundleURL()}override func bundleURL()->URL?{RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot:"index")}}