import { useState, useEffect } from 'react';
import { detectWebRTCSupport, WebRTCSupport } from '@/lib/webrtc-support';

/**
 * WebRTC 支持检测 Hook
 */
export function useWebRTCSupport() {
  const [webrtcSupport, setWebrtcSupport] = useState<WebRTCSupport | null>(null);
  const [showUnsupportedModal, setShowUnsupportedModal] = useState(false);
  const [isChecked, setIsChecked] = useState(false);

  useEffect(() => {
    // 页面加载时检测WebRTC支持
    const support = detectWebRTCSupport();
    setWebrtcSupport(support);
    setIsChecked(true);

    // 如果不支持，自动显示模态框
    if (!support.isSupported) {
      setShowUnsupportedModal(true);
    }
  }, []);

  const closeUnsupportedModal = () => {
    setShowUnsupportedModal(false);
  };

  const showUnsupportedModalManually = () => {
    setShowUnsupportedModal(true);
  };

  return {
    webrtcSupport,
    isSupported: webrtcSupport?.isSupported ?? false,
    isChecked,
    showUnsupportedModal,
    closeUnsupportedModal,
    showUnsupportedModalManually,
  };
}
