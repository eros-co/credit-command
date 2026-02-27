import { NextRequest, NextResponse } from 'next/server';

const MANUS_API_URL = 'https://api.manus.ai/v1';
const MANUS_API_KEY = process.env.MANUS_API_KEY || '';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get('taskId');

  if (!taskId) {
    return NextResponse.json(
      { error: 'taskId is required' },
      { status: 400 }
    );
  }

  try {
    console.log(`[Manus Status] Checking task status: ${taskId}`);

    const response = await fetch(`${MANUS_API_URL}/tasks/${taskId}`, {
      method: 'GET',
      headers: {
        'API_KEY': MANUS_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`[Manus Status] Error response: ${response.status}`);
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.message || 'Failed to get task status', status: response.status },
        { status: response.status }
      );
    }

    const taskData = await response.json();
    console.log(`[Manus Status] Task status:`, taskData.status || 'unknown');

    return NextResponse.json({
      success: true,
      taskId,
      status: taskData.status,
      result: taskData.result,
      output: taskData.output,
      error: taskData.error,
    });
  } catch (error) {
    console.error('[Manus Status] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Failed to check task status: ${errorMessage}` },
      { status: 500 }
    );
  }
}
