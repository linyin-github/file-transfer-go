import React from 'react';
import { AlertTriangle, Download, X, Chrome, Monitor } from 'lucide-react';
import { WebRTCSupport, getBrowserInfo, getRecommendedBrowsers } from '@/lib/webrtc-support';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  webrtcSupport: WebRTCSupport;
}

/**
 * WebRTC 不支持提示模态框
 */
export function WebRTCUnsupportedModal({ isOpen, onClose, webrtcSupport }: Props) {
  const browserInfo = getBrowserInfo();
  const recommendedBrowsers = getRecommendedBrowsers();

  if (!isOpen) return null;

  const handleBrowserDownload = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-red-500" />
            <h2 className="text-xl font-semibold text-gray-900">
              浏览器不支持 WebRTC
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6 space-y-6">
          {/* 当前浏览器信息 */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-medium text-red-800 mb-2">当前浏览器状态</h3>
            <div className="space-y-2 text-sm text-red-700">
              <div>
                <strong>浏览器:</strong> {browserInfo.name} {browserInfo.version}
              </div>
              <div>
                <strong>WebRTC 支持:</strong> 
                <span className="ml-1 px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                  不支持
                </span>
              </div>
            </div>
          </div>

          {/* 缺失的功能 */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900">缺失的功能：</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {webrtcSupport.missing.map((feature, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  {feature}
                </div>
              ))}
            </div>
          </div>

          {/* 功能说明 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-800 mb-2">为什么需要 WebRTC？</h3>
            <div className="space-y-2 text-sm text-blue-700">
              <div className="flex items-start gap-2">
                <Monitor className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <strong>屏幕共享:</strong> 实时共享您的桌面屏幕
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Download className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <strong>文件传输:</strong> 点对点直接传输文件，快速且安全
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Chrome className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <strong>文本传输:</strong> 实时文本和图像传输
                </div>
              </div>
            </div>
          </div>

          {/* 浏览器推荐 */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900">推荐使用以下浏览器：</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {recommendedBrowsers.map((browser, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors cursor-pointer"
                  onClick={() => handleBrowserDownload(browser.downloadUrl)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">{browser.name}</h4>
                      <p className="text-sm text-gray-600">版本 {browser.minVersion}</p>
                    </div>
                    <Download className="h-5 w-5 text-blue-500" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 浏览器特定建议 */}
          {browserInfo.recommendations && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-medium text-yellow-800 mb-2">建议</h3>
              <ul className="space-y-1 text-sm text-yellow-700">
                {browserInfo.recommendations.map((recommendation, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full mt-2 flex-shrink-0"></div>
                    {recommendation}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 技术详情（可折叠） */}
          <details className="border border-gray-200 rounded-lg">
            <summary className="p-3 cursor-pointer font-medium text-gray-900 hover:bg-gray-50">
              技术详情
            </summary>
            <div className="p-3 border-t border-gray-200 space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>RTCPeerConnection:</strong>
                  <span className={`ml-2 px-2 py-1 rounded text-xs ${
                    webrtcSupport.details.rtcPeerConnection 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {webrtcSupport.details.rtcPeerConnection ? '支持' : '不支持'}
                  </span>
                </div>
                <div>
                  <strong>DataChannel:</strong>
                  <span className={`ml-2 px-2 py-1 rounded text-xs ${
                    webrtcSupport.details.dataChannel 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {webrtcSupport.details.dataChannel ? '支持' : '不支持'}
                  </span>
                </div>
              </div>
            </div>
          </details>
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            我知道了
          </button>
          <button
            onClick={() => handleBrowserDownload('https://www.google.com/chrome/')}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
          >
            下载 Chrome 浏览器
          </button>
        </div>
      </div>
    </div>
  );
}
