import React from 'react';
import { AlertCircle, Wifi, WifiOff, Loader2, RotateCcw } from 'lucide-react';
import { WebRTCConnection } from '@/hooks/webrtc/useSharedWebRTCManager';

interface Props {
  webrtc: WebRTCConnection;
  className?: string;
}

/**
 * WebRTC连接状态显示组件
 * 显示详细的连接状态、错误信息和重试按钮
 */
export function WebRTCConnectionStatus({ webrtc, className = '' }: Props) {
  const {
    isConnected,
    isConnecting,
    isWebSocketConnected,
    isPeerConnected,
    error,
    canRetry,
    retry
  } = webrtc;

  // 状态图标
  const getStatusIcon = () => {
    if (isConnecting) {
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    }
    
    if (error) {
      // 区分信息提示和错误
      if (error.includes('对方已离开房间') || error.includes('已离开房间')) {
        return <WifiOff className="h-4 w-4 text-yellow-500" />;
      }
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
    
    if (isPeerConnected) {
      return <Wifi className="h-4 w-4 text-green-500" />;
    }
    
    if (isWebSocketConnected) {
      return <Wifi className="h-4 w-4 text-yellow-500" />;
    }
    
    return <WifiOff className="h-4 w-4 text-gray-400" />;
  };

  // 状态文本
  const getStatusText = () => {
    if (error) {
      return error;
    }
    
    if (isConnecting) {
      return '正在连接...';
    }
    
    if (isPeerConnected) {
      return 'P2P连接已建立';
    }
    
    if (isWebSocketConnected) {
      return '信令服务器已连接';
    }
    
    return '未连接';
  };

  // 状态颜色
  const getStatusColor = () => {
    if (error) {
      // 区分信息提示和错误
      if (error.includes('对方已离开房间') || error.includes('已离开房间')) {
        return 'text-yellow-600';
      }
      return 'text-red-600';
    }
    if (isConnecting) return 'text-blue-600';
    if (isPeerConnected) return 'text-green-600';
    if (isWebSocketConnected) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const handleRetry = async () => {
    try {
      await retry();
    } catch (error) {
      console.error('重试连接失败:', error);
    }
  };

  return (
    <div className={`flex items-center justify-between p-3 bg-white border rounded-lg ${className}`}>
      <div className="flex items-center gap-2">
        {getStatusIcon()}
        <span className={`text-sm font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </span>
      </div>
      
      {/* 连接详细状态指示器 */}
      <div className="flex items-center gap-1">
        {/* WebSocket状态 */}
        <div 
          className={`w-2 h-2 rounded-full ${
            isWebSocketConnected ? 'bg-green-400' : 'bg-gray-300'
          }`}
          title={isWebSocketConnected ? 'WebSocket已连接' : 'WebSocket未连接'}
        />
        
        {/* P2P状态 */}
        <div 
          className={`w-2 h-2 rounded-full ${
            isPeerConnected ? 'bg-green-400' : 'bg-gray-300'
          }`}
          title={isPeerConnected ? 'P2P连接已建立' : 'P2P连接未建立'}
        />
        
        {/* 重试按钮 */}
        {canRetry && (
          <button
            onClick={handleRetry}
            disabled={isConnecting}
            className="ml-2 p-1 text-gray-500 hover:text-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            title="重试连接"
          >
            <RotateCcw className={`h-3 w-3 ${isConnecting ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * 简单的连接状态指示器（用于空间受限的地方）
 */
export function WebRTCStatusIndicator({ webrtc, className = '' }: Props) {
  const { isPeerConnected, isConnecting, error } = webrtc;
  
  if (error) {
    // 区分信息提示和错误
    if (error.includes('对方已离开房间') || error.includes('已离开房间')) {
      return (
        <div className={`flex items-center gap-1 ${className}`}>
          <div className="w-2 h-2 bg-yellow-400 rounded-full" />
          <span className="text-xs text-yellow-600">对方已离开</span>
        </div>
      );
    }
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
        <span className="text-xs text-red-600">连接错误</span>
      </div>
    );
  }
  
  if (isConnecting) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
        <span className="text-xs text-blue-600">连接中</span>
      </div>
    );
  }
  
  if (isPeerConnected) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <div className="w-2 h-2 bg-green-400 rounded-full" />
        <span className="text-xs text-green-600">已连接</span>
      </div>
    );
  }
  
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div className="w-2 h-2 bg-gray-300 rounded-full" />
      <span className="text-xs text-gray-600">未连接</span>
    </div>
  );
}
