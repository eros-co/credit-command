import { NextRequest, NextResponse } from 'next/server';

// In-memory storage for statement results (in production, use a database)
const resultStore = new Map<string, any>();

export async function POST(request: NextRequest) {
  try {
    const { taskId, result } = await request.json();

    if (!taskId || !result) {
      return NextResponse.json(
        { error: 'taskId and result are required' },
        { status: 400 }
      );
    }

    console.log(`[Statement Results] Storing result for task: ${taskId}`);
    resultStore.set(taskId, result);

    return NextResponse.json({
      success: true,
      taskId,
      message: 'Result stored successfully',
    });
  } catch (error) {
    console.error('[Statement Results] Error storing result:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Failed to store result: ${errorMessage}` },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json(
        { error: 'taskId is required' },
        { status: 400 }
      );
    }

    console.log(`[Statement Results] Retrieving result for task: ${taskId}`);
    const result = resultStore.get(taskId);

    if (!result) {
      return NextResponse.json(
        { error: 'Result not found', taskId },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      taskId,
      result,
    });
  } catch (error) {
    console.error('[Statement Results] Error retrieving result:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Failed to retrieve result: ${errorMessage}` },
      { status: 500 }
    );
  }
}
