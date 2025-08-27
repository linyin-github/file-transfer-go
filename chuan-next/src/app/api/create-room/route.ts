import { NextRequest, NextResponse } from 'next/server';

const GO_BACKEND_URL = process.env.GO_BACKEND_URL || 'http://localhost:8080';

export async function POST(request: NextRequest) {
  try {
    console.log('API Route: Creating room, proxying to:', `${GO_BACKEND_URL}/api/create-room`);
    
    // 不再需要解析和转发请求体，因为后端会忽略它们
    const response = await fetch(`${GO_BACKEND_URL}/api/create-room`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // 发送空body即可
      body: JSON.stringify({}),
    });

    const data = await response.json();
    
    console.log('Backend response:', response.status, data);
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('API Route Error:', error);
    return NextResponse.json(
      { error: 'Failed to create room', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
