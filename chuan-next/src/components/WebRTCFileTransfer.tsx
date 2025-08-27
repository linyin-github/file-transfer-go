"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSharedWebRTCManager } from '@/hooks/webrtc/useSharedWebRTCManager';
import { useFileTransferBusiness } from '@/hooks/webrtc/useFileTransferBusiness';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast-simple';
import { Upload, Download } from 'lucide-react';
import { WebRTCFileUpload } from '@/components/webrtc/WebRTCFileUpload';
import { WebRTCFileReceive } from '@/components/webrtc/WebRTCFileReceive';

interface FileInfo {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'ready' | 'downloading' | 'completed';
  progress: number;
}

export const WebRTCFileTransfer: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();
  
  // 独立的文件状态
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileList, setFileList] = useState<FileInfo[]>([]);
  const [downloadedFiles, setDownloadedFiles] = useState<Map<string, File>>(new Map());
  const [currentTransferFile, setCurrentTransferFile] = useState<{
    fileId: string;
    fileName: string;
    progress: number;
  } | null>(null);
  
  // 房间状态
  const [pickupCode, setPickupCode] = useState('');
  const [mode, setMode] = useState<'send' | 'receive'>('send');
  const [hasProcessedInitialUrl, setHasProcessedInitialUrl] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false); // 添加加入房间状态
  const urlProcessedRef = useRef(false); // 使用 ref 防止重复处理 URL
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 创建共享连接 - 使用 useMemo 稳定引用
  const connection = useSharedWebRTCManager();
  const stableConnection = useMemo(() => connection, [connection.isConnected, connection.isConnecting, connection.isWebSocketConnected, connection.error]);
  
  // 使用共享连接创建业务层
  const {
    isConnected,
    isConnecting,
    isWebSocketConnected,
    error,
    connect,
    disconnect,
    sendFile,
    sendFileList,
    requestFile: requestFileFromHook,
    onFileReceived,
    onFileListReceived,
    onFileRequested,
    onFileProgress
  } = useFileTransferBusiness(stableConnection);

  // 加入房间 (接收模式) - 提前定义以供 useEffect 使用
  const joinRoom = useCallback(async (code: string) => {
    console.log('=== 加入房间 ===');
    console.log('取件码:', code);
    
    const trimmedCode = code.trim();
    
    // 检查取件码格式
    if (!trimmedCode || trimmedCode.length !== 6) {
      showToast('请输入正确的6位取件码', "error");
      return;
    }

    // 防止重复调用 - 检查是否已经在连接或已连接
    if (isConnecting || isConnected || isJoiningRoom) {
      console.log('已在连接中或已连接，跳过重复的房间状态检查');
      return;
    }
    
    setIsJoiningRoom(true);
    
    try {
      // 先检查房间状态
      console.log('检查房间状态...');
      
      const response = await fetch(`/api/room-info?code=${trimmedCode}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: 无法检查房间状态`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        let errorMessage = result.message || '房间不存在或已过期';
        if (result.message?.includes('expired')) {
          errorMessage = '房间已过期，请联系发送方重新创建';
        } else if (result.message?.includes('not found')) {
          errorMessage = '房间不存在，请检查取件码是否正确';
        }
        showToast(errorMessage, "error");
        return;
      }
      
      // 检查发送方是否在线 (使用新的字段名)
      if (!result.sender_online) {
        showToast('发送方不在线，请确认取件码是否正确或联系发送方', "error");
        return;
      }
      
      console.log('房间状态检查通过，开始连接...');
      setPickupCode(trimmedCode);
      
      connect(trimmedCode, 'receiver');
      
      showToast(`正在连接到房间: ${trimmedCode}`, "success");
    } catch (error) {
      console.error('检查房间状态失败:', error);
      let errorMessage = '检查房间状态失败';
      
      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = '网络连接失败，请检查网络状况';
        } else if (error.message.includes('timeout')) {
          errorMessage = '请求超时，请重试';
        } else if (error.message.includes('HTTP 404')) {
          errorMessage = '房间不存在，请检查取件码';
        } else if (error.message.includes('HTTP 500')) {
          errorMessage = '服务器错误，请稍后重试';
        } else {
          errorMessage = error.message;
        }
      }
      
      showToast(errorMessage, "error");
    } finally {
      setIsJoiningRoom(false); // 重置加入房间状态
    }
  }, [isConnecting, isConnected, isJoiningRoom, showToast, connect]); // 添加isJoiningRoom依赖

  // 从URL参数中获取初始模式（仅在首次加载时处理）
  useEffect(() => {
    // 使用 ref 确保只处理一次，避免严格模式的重复调用
    if (urlProcessedRef.current) {
      console.log('URL已处理过，跳过重复处理');
      return;
    }

    const urlMode = searchParams.get('mode') as 'send' | 'receive';
    const type = searchParams.get('type');
    const code = searchParams.get('code');
    
    // 只在首次加载且URL中有webrtc类型时处理
    if (!hasProcessedInitialUrl && type === 'webrtc' && urlMode && ['send', 'receive'].includes(urlMode)) {
      console.log('=== 处理初始URL参数 ===');
      console.log('URL模式:', urlMode, '类型:', type, '取件码:', code);
      
      // 立即标记为已处理，防止重复
      urlProcessedRef.current = true;
      
      setMode(urlMode);
      setHasProcessedInitialUrl(true);
      
      if (code && urlMode === 'receive') {
        console.log('URL中有取件码，自动加入房间');
        // 防止重复调用 - 检查连接状态和加入房间状态
        if (!isConnecting && !isConnected && !isJoiningRoom) {
          // 直接调用异步函数，不依赖 joinRoom
          const autoJoinRoom = async () => {
            const trimmedCode = code.trim();
            
            if (!trimmedCode || trimmedCode.length !== 6) {
              showToast('请输入正确的6位取件码', "error");
              return;
            }

            setIsJoiningRoom(true);
            
            try {
              console.log('检查房间状态...');
              const response = await fetch(`/api/room-info?code=${trimmedCode}`);
              
              if (!response.ok) {
                throw new Error(`HTTP ${response.status}: 无法检查房间状态`);
              }
              
              const result = await response.json();
              
              if (!result.success) {
                let errorMessage = result.message || '房间不存在或已过期';
                if (result.message?.includes('expired')) {
                  errorMessage = '房间已过期，请联系发送方重新创建';
                } else if (result.message?.includes('not found')) {
                  errorMessage = '房间不存在，请检查取件码是否正确';
                }
                showToast(errorMessage, "error");
                return;
              }
              
              if (!result.sender_online) {
                showToast('发送方不在线，请确认取件码是否正确或联系发送方', "error");
                return;
              }
              
              console.log('房间状态检查通过，开始连接...');
              setPickupCode(trimmedCode);
              connect(trimmedCode, 'receiver');
              showToast(`正在连接到房间: ${trimmedCode}`, "success");
            } catch (error) {
              console.error('检查房间状态失败:', error);
              let errorMessage = '检查房间状态失败';
              
              if (error instanceof Error) {
                if (error.message.includes('network') || error.message.includes('fetch')) {
                  errorMessage = '网络连接失败，请检查网络状况';
                } else if (error.message.includes('timeout')) {
                  errorMessage = '请求超时，请重试';
                } else if (error.message.includes('HTTP 404')) {
                  errorMessage = '房间不存在，请检查取件码';
                } else if (error.message.includes('HTTP 500')) {
                  errorMessage = '服务器错误，请稍后重试';
                } else {
                  errorMessage = error.message;
                }
              }
              
              showToast(errorMessage, "error");
            } finally {
              setIsJoiningRoom(false);
            }
          };
          
          autoJoinRoom();
        } else {
          console.log('已在连接中或加入房间中，跳过重复处理');
        }
      }
    }
  }, [searchParams, hasProcessedInitialUrl, isConnecting, isConnected, isJoiningRoom, showToast, connect]); // 添加isJoiningRoom依赖

  // 更新URL参数
  const updateMode = useCallback((newMode: 'send' | 'receive') => {
    console.log('=== 手动切换模式 ===');
    console.log('新模式:', newMode);
    
    setMode(newMode);
    const params = new URLSearchParams(searchParams.toString());
    params.set('type', 'webrtc');
    params.set('mode', newMode);
    
    // 如果切换到发送模式，移除code参数
    if (newMode === 'send') {
      params.delete('code');
    }
    
    router.push(`?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  // 生成文件ID
  const generateFileId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };

  // 文件选择处理
  const handleFileSelect = (files: File[]) => {
    console.log('=== 文件选择 ===');
    console.log('新文件:', files.map(f => f.name));
    
    // 更新选中的文件
    setSelectedFiles(prev => [...prev, ...files]);
    
    // 创建对应的文件信息
    const newFileInfos: FileInfo[] = files.map(file => ({
      id: generateFileId(),
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'ready',
      progress: 0
    }));
    
    setFileList(prev => {
      const updatedList = [...prev, ...newFileInfos];
      console.log('更新后的文件列表:', updatedList);
      
      // 如果P2P连接已建立，立即同步文件列表
      if (isConnected && connection.isPeerConnected && pickupCode) {
        console.log('立即同步文件列表到对端');
        setTimeout(() => sendFileList(updatedList), 100);
      }
      
      return updatedList;
    });
  };

  // 创建房间 (发送模式)
  const generateCode = async () => {
    if (selectedFiles.length === 0) {
      showToast("需要选择文件才能创建传输房间", "error");
      return;
    }

    try {
      console.log('=== 创建房间 ===');
      console.log('选中文件数:', selectedFiles.length);
      
      // 创建后端房间 - 简化版本，不发送无用的文件信息
      const response = await fetch('/api/create-room', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // 不再发送文件列表，因为后端不使用这些信息
        body: JSON.stringify({}),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '创建房间失败');
      }

      const code = data.code;
      console.log('房间创建成功，取件码:', code);
      
      // 先连接WebRTC作为发送方，再设置取件码
      // 这样可以确保UI状态与连接状态同步
      await connect(code, 'sender');
      setPickupCode(code);
      
      showToast(`房间创建成功，取件码: ${code}`, "success");
    } catch (error) {
      console.error('创建房间失败:', error);
      let errorMessage = '创建房间失败';
      
      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = '网络连接失败，请检查网络后重试';
        } else if (error.message.includes('timeout')) {
          errorMessage = '请求超时，请重试';
        } else if (error.message.includes('server') || error.message.includes('500')) {
          errorMessage = '服务器错误，请稍后重试';
        } else {
          errorMessage = error.message;
        }
      }
      
      showToast(errorMessage, "error");
    }
  };

  // 重置连接状态 (用于连接失败后重新输入)
  const resetConnection = () => {
    console.log('=== 重置连接状态 ===');
    
    // 断开当前连接
    disconnect();
    
    // 清空状态
    setPickupCode('');
    setFileList([]);
    setDownloadedFiles(new Map());
    
    // 如果是接收模式，更新URL移除code参数
    if (mode === 'receive') {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('code');
      router.push(`?${params.toString()}`, { scroll: false });
    }
  };

  // 处理文件列表更新
  useEffect(() => {
    const cleanup = onFileListReceived((fileInfos: FileInfo[]) => {
      console.log('=== 收到文件列表更新 ===');
      console.log('文件列表:', fileInfos);
      console.log('当前模式:', mode);
      
      if (mode === 'receive') {
        setFileList(fileInfos);
      }
    });

    return cleanup;
  }, [onFileListReceived, mode]);

  // 处理连接错误
  const [lastError, setLastError] = useState<string>('');
  useEffect(() => {
    if (error && error !== lastError) {
      console.log('=== 连接错误处理 ===');
      console.log('错误信息:', error);
      console.log('当前模式:', mode);
      
      // 根据错误类型显示不同的提示
      let errorMessage = error;
      
      if (error.includes('WebSocket')) {
        errorMessage = '服务器连接失败，请检查网络连接或稍后重试';
      } else if (error.includes('数据通道')) {
        errorMessage = '数据通道连接失败，请重新尝试连接';
      } else if (error.includes('连接超时')) {
        errorMessage = '连接超时，请检查网络状况或重新尝试';
      } else if (error.includes('连接失败')) {
        errorMessage = 'WebRTC连接失败，可能是网络环境限制，请尝试刷新页面';
      } else if (error.includes('信令错误')) {
        errorMessage = '信令服务器错误，请稍后重试';
      } else if (error.includes('创建连接失败')) {
        errorMessage = '无法建立P2P连接，请检查网络设置';
      }
      
      // 显示错误提示
      showToast(errorMessage, "error");
      setLastError(error);
      
      // 如果是严重连接错误，清理传输状态
      if (error.includes('连接失败') || error.includes('数据通道连接失败') || error.includes('WebSocket')) {
        console.log('严重连接错误，清理传输状态');
        setCurrentTransferFile(null);
        
        // 重置所有正在传输的文件状态
        setFileList(prev => prev.map(item => 
          item.status === 'downloading' 
            ? { ...item, status: 'ready' as const, progress: 0 }
            : item
        ));
      }
    }
  }, [error, mode, showToast, lastError]);

  // 处理文件接收
  useEffect(() => {
    const cleanup = onFileReceived((fileData: { id: string; file: File }) => {
      console.log('=== 接收到文件 ===');
      console.log('文件:', fileData.file.name, 'ID:', fileData.id);
      
      // 更新下载的文件
      setDownloadedFiles(prev => new Map(prev.set(fileData.id, fileData.file)));
      
      // 更新文件状态
      setFileList(prev => prev.map(item => 
        item.id === fileData.id 
          ? { ...item, status: 'completed' as const, progress: 100 }
          : item
      ));
      
      // 移除不必要的Toast - 文件完成状态在UI中已经显示
    });

    return cleanup;
  }, [onFileReceived]);

  // 监听文件级别的进度更新
  useEffect(() => {
    const cleanup = onFileProgress((progressInfo) => {
      // 检查连接状态，如果连接断开则忽略进度更新
      if (!isConnected || error) {
        console.log('连接已断开，忽略进度更新:', progressInfo.fileName);
        return;
      }

      console.log('=== 文件进度更新 ===');
      console.log('文件:', progressInfo.fileName, 'ID:', progressInfo.fileId, '进度:', progressInfo.progress);
      
      // 更新当前传输文件信息
      setCurrentTransferFile({
        fileId: progressInfo.fileId,
        fileName: progressInfo.fileName,
        progress: progressInfo.progress
      });
      
      // 更新文件列表中对应文件的进度
      setFileList(prev => prev.map(item => {
        if (item.id === progressInfo.fileId || item.name === progressInfo.fileName) {
          const newProgress = progressInfo.progress;
          const newStatus = newProgress >= 100 ? 'completed' as const : 'downloading' as const;
          
          console.log(`更新文件 ${item.name} 进度: ${item.progress} -> ${newProgress}`);
          return { ...item, progress: newProgress, status: newStatus };
        }
        return item;
      }));
      
      // 当传输完成时显示提示
      if (progressInfo.progress >= 100 && mode === 'send') {
        // 移除不必要的Toast - 传输完成状态在UI中已经显示
        setCurrentTransferFile(null);
      }
    });

    return cleanup;
  }, [onFileProgress, mode, isConnected, error]);

  // 实时更新传输进度（旧逻辑 - 删除）
  // useEffect(() => {
  //   ...已删除的旧代码...
  // }, [...]);

  // 处理文件请求（发送方监听）
  useEffect(() => {
    const cleanup = onFileRequested((fileId: string, fileName: string) => {
      console.log('=== 收到文件请求 ===');
      console.log('文件:', fileName, 'ID:', fileId, '当前模式:', mode);
      
      if (mode === 'send') {
        // 检查连接状态
        if (!isConnected || error) {
          console.log('连接已断开，无法发送文件');
          showToast('连接已断开，无法发送文件', "error");
          return;
        }

        console.log('当前选中的文件列表:', selectedFiles.map(f => f.name));
        
        // 在发送方的selectedFiles中查找对应文件
        const file = selectedFiles.find(f => f.name === fileName);
        
        if (!file) {
          console.error('找不到匹配的文件:', fileName);
          console.log('可用文件:', selectedFiles.map(f => `${f.name} (${f.size} bytes)`));
          showToast(`无法找到文件: ${fileName}`, "error");
          return;
        }
        
        console.log('找到匹配文件，开始发送:', file.name, 'ID:', fileId, '文件大小:', file.size);
        
        // 更新发送方文件状态为downloading
        setFileList(prev => prev.map(item => 
          item.id === fileId || item.name === fileName
            ? { ...item, status: 'downloading' as const, progress: 0 }
            : item
        ));
        
        // 发送文件
        try {
          sendFile(file, fileId);
          
          // 移除不必要的Toast - 传输开始状态在UI中已经显示
        } catch (sendError) {
          console.error('发送文件失败:', sendError);
          showToast(`发送文件失败: ${fileName}`, "error");
          
          // 重置文件状态
          setFileList(prev => prev.map(item => 
            item.id === fileId || item.name === fileName
              ? { ...item, status: 'ready' as const, progress: 0 }
              : item
          ));
        }
      } else {
        console.warn('接收模式下收到文件请求，忽略');
      }
    });

    return cleanup;
  }, [onFileRequested, mode, selectedFiles, sendFile, isConnected, error]);

  // 监听WebSocket连接状态变化
  useEffect(() => {
    console.log('=== WebSocket状态变化 ===');
    console.log('WebSocket连接状态:', isWebSocketConnected);
    console.log('WebRTC连接状态:', isConnected);
    console.log('连接中状态:', isConnecting);
    
    // 只有在之前已经建立过连接，现在断开的情况下才显示断开提示
    // 避免在初始连接时误报断开
    if (!isWebSocketConnected && !isConnected && !isConnecting && pickupCode) {
      // 增加额外检查：只有在之前曾经连接成功过的情况下才显示断开提示
      // 通过检查是否有文件列表来判断是否曾经连接过
      if (fileList.length > 0 || currentTransferFile) {
        showToast('与服务器的连接已断开，请重新连接', "error");
        
        // 清理传输状态
        console.log('WebSocket断开，清理传输状态');
        setCurrentTransferFile(null);
        setFileList(prev => prev.map(item => 
          item.status === 'downloading' 
            ? { ...item, status: 'ready' as const, progress: 0 }
            : item
        ));
      }
    }
    
    // WebSocket连接成功时的提示
    if (isWebSocketConnected && isConnecting && !isConnected) {
      console.log('WebSocket已连接，正在建立P2P连接...');
    }
    
  }, [isWebSocketConnected, isConnected, isConnecting, pickupCode, showToast, fileList.length, currentTransferFile]);

  // 监听连接状态变化，清理传输状态
  useEffect(() => {
    // 当连接断开或有错误时，清理所有传输状态
    if ((!isConnected && !isConnecting) || error) {
      if (currentTransferFile) {
        console.log('连接断开，清理当前传输文件状态:', currentTransferFile.fileName);
        setCurrentTransferFile(null);
      }
      
      // 重置所有正在下载的文件状态
      setFileList(prev => {
        const hasDownloadingFiles = prev.some(item => item.status === 'downloading');
        if (hasDownloadingFiles) {
          console.log('重置正在传输的文件状态');
          return prev.map(item => 
            item.status === 'downloading' 
              ? { ...item, status: 'ready' as const, progress: 0 }
              : item
          );
        }
        return prev;
      });
    }
  }, [isConnected, isConnecting, error, currentTransferFile]);

  // 监听连接状态变化并提供用户反馈
  useEffect(() => {
    console.log('=== WebRTC连接状态变化 ===');
    console.log('连接状态:', {
      isConnected,
      isConnecting,
      isWebSocketConnected,
      pickupCode,
      mode,
      selectedFilesCount: selectedFiles.length,
      fileListCount: fileList.length
    });
    
    // 连接成功时的提示
    if (isConnected && !isConnecting) {
      if (mode === 'send') {
        // 移除不必要的Toast - 连接状态在UI中已经显示
      } else {
        // 移除不必要的Toast - 连接状态在UI中已经显示
      }
    }
    
    // 连接中的状态
    if (isConnecting && pickupCode) {
      console.log('正在建立WebRTC连接...');
    }
    
    // 只有在P2P连接建立且没有错误时才发送文件列表
    if (isConnected && connection.isPeerConnected && !error && pickupCode && mode === 'send' && selectedFiles.length > 0) {
      // 确保有文件列表
      if (fileList.length === 0) {
        console.log('创建文件列表并发送...');
        const newFileInfos: FileInfo[] = selectedFiles.map(file => ({
          id: generateFileId(),
          name: file.name,
          size: file.size,
          type: file.type,
          status: 'ready',
          progress: 0
        }));
        setFileList(newFileInfos);
        // 延迟发送，确保数据通道已准备好
        setTimeout(() => {
          if (isConnected && connection.isPeerConnected && !error) { // 再次检查连接状态
            sendFileList(newFileInfos);
          }
        }, 500);
      } else if (fileList.length > 0) {
        console.log('发送现有文件列表...');
        // 延迟发送，确保数据通道已准备好
        setTimeout(() => {
          if (isConnected && connection.isPeerConnected && !error) { // 再次检查连接状态
            sendFileList(fileList);
          }
        }, 500);
      }
    }
  }, [isConnected, connection.isPeerConnected, isConnecting, isWebSocketConnected, pickupCode, mode, selectedFiles.length, error]);

  // 监听P2P连接建立，自动发送文件列表
  useEffect(() => {
    if (connection.isPeerConnected && mode === 'send' && fileList.length > 0) {
      console.log('P2P连接已建立，发送文件列表...');
      // 稍微延迟一下，确保数据通道完全准备好
      setTimeout(() => {
        if (connection.isPeerConnected && connection.getChannelState() === 'open') {
          sendFileList(fileList);
        }
      }, 200);
    }
  }, [connection.isPeerConnected, mode, fileList.length, sendFileList]);

  // 请求下载文件（接收方调用）
  const requestFile = (fileId: string) => {
    if (mode !== 'receive') {
      console.error('requestFile只能在接收模式下调用');
      return;
    }

    // 检查连接状态
    if (!isConnected || error) {
      showToast('连接已断开，请重新连接后再试', "error");
      return;
    }

    const fileInfo = fileList.find(f => f.id === fileId);
    if (!fileInfo) {
      console.error('找不到文件信息:', fileId);
      showToast('找不到文件信息', "error");
      return;
    }
    
    console.log('=== 开始请求文件 ===');
    console.log('文件信息:', { name: fileInfo.name, id: fileId, size: fileInfo.size });
    console.log('当前文件状态:', fileInfo.status);
    console.log('WebRTC连接状态:', { isConnected, isTransferring: !!currentTransferFile });
    
    // 更新文件状态为下载中
    setFileList(prev => {
      const updated = prev.map(item => 
        item.id === fileId 
          ? { ...item, status: 'downloading' as const, progress: 0 }
          : item
      );
      console.log('更新后的文件列表:', updated.find(f => f.id === fileId));
      return updated;
    });
    
    // 使用hook的requestFile功能
    console.log('调用hook的requestFile...');
    try {
      requestFileFromHook(fileId, fileInfo.name);
      // 移除不必要的Toast - 请求状态在UI中已经显示
    } catch (requestError) {
      console.error('请求文件失败:', requestError);
      showToast(`请求文件失败: ${fileInfo.name}`, "error");
      
      // 重置文件状态
      setFileList(prev => prev.map(item => 
        item.id === fileId 
          ? { ...item, status: 'ready' as const, progress: 0 }
          : item
      ));
    }
  };

  // 复制取件码
  const copyCode = () => {
    navigator.clipboard.writeText(pickupCode);
    showToast("取件码已复制", "success");
  };

  // 复制链接
  const copyLink = () => {
    const link = `${window.location.origin}?type=webrtc&mode=receive&code=${pickupCode}`;
    navigator.clipboard.writeText(link);
    showToast("取件链接已复制", "success");
  };

  // 重置状态
  const resetRoom = () => {
    console.log('=== 重置房间 ===');
    disconnect();
    setPickupCode('');
    setSelectedFiles([]);
    setFileList([]);
    setDownloadedFiles(new Map());
  };

  // 添加更多文件
  const addMoreFiles = () => {
    fileInputRef.current?.click();
  };

  // 清空文件
  const clearFiles = () => {
    console.log('=== 清空文件 ===');
    setSelectedFiles([]);
    setFileList([]);
    // 只有在P2P连接建立且数据通道准备好时才发送清空消息
    if (isConnected && connection.isPeerConnected && connection.getChannelState() === 'open' && pickupCode) {
      sendFileList([]);
    }
  };

  // 下载文件到本地
  const downloadFile = (fileId: string) => {
    const file = downloadedFiles.get(fileId);
    if (!file) return;
    
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast(`${file.name} 已保存到下载文件夹`, "success");
  };

  // 处理下载请求（接收模式）
  const handleDownloadRequest = (fileId: string) => {
    const file = downloadedFiles.get(fileId);
    if (file) {
      // 文件已下载完成，保存到本地
      downloadFile(fileId);
    } else {
      // 文件未下载，请求传输
      requestFile(fileId);
    }
  };

  const pickupLink = pickupCode ? `${typeof window !== 'undefined' ? window.location.origin : ''}?type=webrtc&mode=receive&code=${pickupCode}` : '';

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 模式切换 */}
      <div className="flex justify-center mb-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-1 shadow-lg">
          <Button
            variant={mode === 'send' ? 'default' : 'ghost'}
            onClick={() => updateMode('send')}
            className="px-6 py-2 rounded-lg"
          >
            <Upload className="w-4 h-4 mr-2" />
            发送文件
          </Button>
          <Button
            variant={mode === 'receive' ? 'default' : 'ghost'}
            onClick={() => updateMode('receive')}
            className="px-6 py-2 rounded-lg"
          >
            <Download className="w-4 h-4 mr-2" />
            接收文件
          </Button>
        </div>
      </div>

      {mode === 'send' ? (
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-lg border border-white/20 animate-fade-in-up">
          {/* 连接状态显示 */}

          <WebRTCFileUpload
            selectedFiles={selectedFiles}
            fileList={fileList}
            onFilesChange={setSelectedFiles}
            onGenerateCode={generateCode}
            pickupCode={pickupCode}
            pickupLink={pickupLink}
            onCopyCode={copyCode}
            onCopyLink={copyLink}
            onAddMoreFiles={addMoreFiles}
            onRemoveFile={setSelectedFiles}
            onClearFiles={clearFiles}
            onReset={resetRoom}
            disabled={!!currentTransferFile}
          />
        </div>
      ) : (
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-lg border border-white/20 animate-fade-in-up">
         
          
          <WebRTCFileReceive
            onJoinRoom={joinRoom}
            files={fileList}
            onDownloadFile={handleDownloadRequest}
            isConnected={isConnected}
            isConnecting={isConnecting}
            isWebSocketConnected={isWebSocketConnected}
            downloadedFiles={downloadedFiles}
            error={error}
            onReset={resetConnection}
          />
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={(e) => handleFileSelect(Array.from(e.target.files || []))}
        className="hidden"
      />
    </div>
  );
};
