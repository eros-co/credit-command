import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Manus webhook payload structure
    const { event_type, task_detail, progress_detail } = body;
    
    // Only process task_stopped events (completed tasks)
    if (event_type === 'task_stopped' && task_detail) {
      const { task_id, message, attachments, stop_reason } = task_detail;
      
      // If the task completed successfully and has attachments (parsed data)
      if (stop_reason === 'finish' && attachments && attachments.length > 0) {
        // The parsed transaction data should be in the attachments
        // For now, we'll log it and return success
        console.log('✅ PDF Processing Complete:', {
          taskId: task_id,
          attachmentCount: attachments.length,
          message
        });
        
        // In a real scenario, you'd:
        // 1. Download the attachment from the URL
        // 2. Parse the JSON data
        // 3. Store it in your database or state
        // 4. Notify the frontend via WebSocket or polling
        
        return NextResponse.json({
          success: true,
          message: 'Webhook received and processed',
          taskId: task_id,
          attachments
        });
      }
      
      // If the task requires user input
      if (stop_reason === 'ask') {
        console.log('⚠️ Task requires user input:', message);
        return NextResponse.json({
          success: true,
          message: 'Task requires user input',
          taskId: task_id,
          userMessage: message
        });
      }
    }
    
    // Log other event types for debugging
    console.log('📨 Webhook event received:', event_type);
    
    return NextResponse.json({
      success: true,
      message: 'Webhook received'
    });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}
