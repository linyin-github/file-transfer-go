/**
 * WebRTC 浏览器支持检测工具
 */

export interface WebRTCSupport {
  isSupported: boolean;
  missing: string[];
  details: {
    rtcPeerConnection: boolean;
    dataChannel: boolean;
  };
}

/**
 * 检测浏览器是否支持WebRTC及其相关功能
 */
export function detectWebRTCSupport(): WebRTCSupport {
  const missing: string[] = [];
  const details = {
    rtcPeerConnection: false,
    getUserMedia: false,
    getDisplayMedia: false,
    dataChannel: false,
  };

  // 检测 RTCPeerConnection
  if (typeof RTCPeerConnection !== 'undefined') {
    details.rtcPeerConnection = true;
  } else {
    missing.push('RTCPeerConnection');
  }



  // 检测 DataChannel 支持
  try {
    if (typeof RTCPeerConnection !== 'undefined') {
      const pc = new RTCPeerConnection();
      const dc = pc.createDataChannel('test');
      if (dc) {
        details.dataChannel = true;
      }
      pc.close();
    }
  } catch (error) {
    missing.push('DataChannel');
  }

  const isSupported = missing.length === 0;

  return {
    isSupported,
    missing,
    details,
  };
}

/**
 * 获取浏览器信息
 */
export function getBrowserInfo(): {
  name: string;
  version: string;
  isSupported: boolean;
  recommendations?: string[];
} {
  const userAgent = navigator.userAgent;
  let browserName = 'Unknown';
  let version = 'Unknown';
  let isSupported = true;
  const recommendations: string[] = [];

  // Chrome
  if (/Chrome/.test(userAgent) && !/Edg/.test(userAgent)) {
    browserName = 'Chrome';
    const match = userAgent.match(/Chrome\/(\d+)/);
    version = match ? match[1] : 'Unknown';
    isSupported = parseInt(version) >= 23;
    if (!isSupported) {
      recommendations.push('请升级到 Chrome 23 或更新版本');
    }
  }
  // Firefox
  else if (/Firefox/.test(userAgent)) {
    browserName = 'Firefox';
    const match = userAgent.match(/Firefox\/(\d+)/);
    version = match ? match[1] : 'Unknown';
    isSupported = parseInt(version) >= 22;
    if (!isSupported) {
      recommendations.push('请升级到 Firefox 22 或更新版本');
    }
  }
  // Safari
  else if (/Safari/.test(userAgent) && !/Chrome/.test(userAgent)) {
    browserName = 'Safari';
    const match = userAgent.match(/Version\/(\d+)/);
    version = match ? match[1] : 'Unknown';
    isSupported = parseInt(version) >= 11;
    if (!isSupported) {
      recommendations.push('请升级到 Safari 11 或更新版本');
    }
  }
  // Edge
  else if (/Edg/.test(userAgent)) {
    browserName = 'Edge';
    const match = userAgent.match(/Edg\/(\d+)/);
    version = match ? match[1] : 'Unknown';
    isSupported = parseInt(version) >= 12;
    if (!isSupported) {
      recommendations.push('请升级到 Edge 12 或更新版本');
    }
  }
  // Internet Explorer
  else if (/MSIE|Trident/.test(userAgent)) {
    browserName = 'Internet Explorer';
    isSupported = false;
    recommendations.push(
      '请使用现代浏览器，如 Chrome、Firefox、Safari 或 Edge',
      'Internet Explorer 不支持 WebRTC'
    );
  }

  return {
    name: browserName,
    version,
    isSupported,
    recommendations: recommendations.length > 0 ? recommendations : undefined,
  };
}

/**
 * 获取推荐的浏览器列表
 */
export function getRecommendedBrowsers(): Array<{
  name: string;
  minVersion: string;
  downloadUrl: string;
}> {
  return [
    {
      name: 'Google Chrome',
      minVersion: '23+',
      downloadUrl: 'https://www.google.com/chrome/',
    },
    {
      name: 'Mozilla Firefox',
      minVersion: '22+',
      downloadUrl: 'https://www.mozilla.org/firefox/',
    },
    {
      name: 'Safari',
      minVersion: '11+',
      downloadUrl: 'https://www.apple.com/safari/',
    },
    {
      name: 'Microsoft Edge',
      minVersion: '12+',
      downloadUrl: 'https://www.microsoft.com/edge',
    },
  ];
}
