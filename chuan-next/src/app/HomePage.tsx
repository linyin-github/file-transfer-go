"use client";

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, MessageSquare, Monitor, Users } from 'lucide-react';
import Hero from '@/components/Hero';
import { WebRTCFileTransfer } from '@/components/WebRTCFileTransfer';
import { WebRTCTextImageTransfer } from '@/components/WebRTCTextImageTransfer';
import DesktopShare from '@/components/DesktopShare';
import WeChatGroup from '@/components/WeChatGroup';
import { WebRTCUnsupportedModal } from '@/components/WebRTCUnsupportedModal';
import { useWebRTCSupport } from '@/hooks/useWebRTCSupport';

export default function HomePage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('webrtc');
  const [hasInitialized, setHasInitialized] = useState(false);
  
  // WebRTC 支持检测
  const {
    webrtcSupport,
    isSupported,
    isChecked,
    showUnsupportedModal,
    closeUnsupportedModal,
    showUnsupportedModalManually,
  } = useWebRTCSupport();
  
  // 根据URL参数设置初始标签（仅首次加载时）
  useEffect(() => {
    if (!hasInitialized) {
      const urlType = searchParams.get('type');
      
      console.log('=== HomePage URL处理 ===');
      console.log('URL type参数:', urlType);
      console.log('所有搜索参数:', Object.fromEntries(searchParams.entries()));
      
      // 将旧的text类型重定向到message
      if (urlType === 'text') {
        console.log('检测到text类型，重定向到message标签页');
        setActiveTab('message');
      } else if (urlType === 'webrtc') {
        // webrtc类型对应文件传输标签页
        console.log('检测到webrtc类型，切换到webrtc标签页（文件传输）');
        setActiveTab('webrtc');
      } else if (urlType && ['message', 'desktop'].includes(urlType)) {
        console.log('切换到对应标签页:', urlType);
        setActiveTab(urlType);
      } else {
        console.log('没有有效的type参数，使用默认标签页：webrtc（文件传输）');
      }
      
      setHasInitialized(true);
    }
  }, [searchParams, hasInitialized]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-4 sm:py-6 md:py-8">
        {/* Hero Section */}
        <div className="text-center mb-6 sm:mb-8">
          <Hero />
        </div>

        {/* WebRTC 支持检测加载状态 */}
        {!isChecked && (
          <div className="max-w-4xl mx-auto text-center py-8">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-48 mx-auto mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-32 mx-auto"></div>
            </div>
            <p className="mt-4 text-gray-600">正在检测浏览器支持...</p>
          </div>
        )}

        {/* 主要内容 - 只有在检测完成后才显示 */}
        {isChecked && (
          <div className="max-w-4xl mx-auto">
            {/* WebRTC 不支持时的警告横幅 */}
            {!isSupported && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-red-700 font-medium">
                      当前浏览器不支持 WebRTC，功能可能无法正常使用
                    </span>
                  </div>
                  <button
                    onClick={showUnsupportedModalManually}
                    className="text-red-600 hover:text-red-800 text-sm underline"
                  >
                    查看详情
                  </button>
                </div>
              </div>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              {/* Tabs Navigation - 横向布局 */}
              <div className="mb-6">
                <TabsList className="grid w-full grid-cols-4 max-w-2xl mx-auto h-auto bg-white/90 backdrop-blur-sm shadow-lg rounded-xl p-2 border border-slate-200">
                  <TabsTrigger 
                    value="webrtc" 
                    className="flex items-center justify-center space-x-2 px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 hover:bg-slate-50 data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:hover:bg-blue-600"
                    disabled={!isSupported}
                  >
                    <Upload className="w-4 h-4" />
                    <span className="hidden sm:inline">文件传输</span>
                    <span className="sm:hidden">文件</span>
                    {!isSupported && <span className="text-xs opacity-60">*</span>}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="message" 
                    className="flex items-center justify-center space-x-2 px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 hover:bg-slate-50 data-[state=active]:bg-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:hover:bg-emerald-600"
                    disabled={!isSupported}
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span className="hidden sm:inline">文本消息</span>
                    <span className="sm:hidden">消息</span>
                    {!isSupported && <span className="text-xs opacity-60">*</span>}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="desktop" 
                    className="flex items-center justify-center space-x-2 px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 hover:bg-slate-50 data-[state=active]:bg-purple-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:hover:bg-purple-600"
                    disabled={!isSupported}
                  >
                    <Monitor className="w-4 h-4" />
                    <span className="hidden sm:inline">共享桌面</span>
                    <span className="sm:hidden">桌面</span>
                    {!isSupported && <span className="text-xs opacity-60">*</span>}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="wechat" 
                    className="flex items-center justify-center space-x-2 px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 hover:bg-slate-50 data-[state=active]:bg-green-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:hover:bg-green-600"
                  >
                    <Users className="w-4 h-4" />
                    <span className="hidden sm:inline">微信群</span>
                    <span className="sm:hidden">微信</span>
                  </TabsTrigger>                
                </TabsList>
                
                {/* WebRTC 不支持时的提示 */}
                {!isSupported && (
                  <p className="text-center text-xs text-gray-500 mt-2">
                    * 需要 WebRTC 支持才能使用
                  </p>
                )}
              </div>

              {/* Tab Content */}
              <div>
                <TabsContent value="webrtc" className="mt-0 animate-fade-in-up">
                  <WebRTCFileTransfer />
                </TabsContent>

                <TabsContent value="message" className="mt-0 animate-fade-in-up">
                  <WebRTCTextImageTransfer />
                </TabsContent>

                <TabsContent value="desktop" className="mt-0 animate-fade-in-up">
                  <DesktopShare />
                </TabsContent>

                <TabsContent value="wechat" className="mt-0 animate-fade-in-up">
                  <WeChatGroup />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        )}
      </div>

      {/* WebRTC 不支持提示模态框 */}
      {webrtcSupport && (
        <WebRTCUnsupportedModal
          isOpen={showUnsupportedModal}
          onClose={closeUnsupportedModal}
          webrtcSupport={webrtcSupport}
        />
      )}
    </div>
  );
}
