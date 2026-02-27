import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[Webhook] Received event:', body.event_type);

    // Handle task_stopped events (task completion)
    if (body.event_type === 'task_stopped') {
      const taskDetail = body.task_detail || {};
      const taskId = taskDetail.task_id;
      const message = taskDetail.message || '';
      const stopReason = taskDetail.stop_reason;

      console.log(`[Webhook] Task stopped: ${taskId}, reason: ${stopReason}`);

      if (stopReason === 'finish') {
        // Try to extract JSON from the message
        let parsedResult = null;

        // Look for JSON in the message
        try {
          // Try to find JSON object in the message
          const jsonMatch = message.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsedResult = JSON.parse(jsonMatch[0]);
            console.log('[Webhook] Successfully extracted JSON from message');
          }
        } catch (e) {
          console.log('[Webhook] Could not parse JSON from message:', e);
        }

        // If we found a result, store it
        if (parsedResult) {
          try {
            const storeRes = await fetch(
              new URL('/api/statement-results', request.url),
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  taskId,
                  result: parsedResult,
                }),
              }
            );

            if (storeRes.ok) {
              console.log(`[Webhook] Successfully stored result for task: ${taskId}`);
            } else {
              console.error('[Webhook] Failed to store result:', await storeRes.text());
            }
          } catch (err) {
            console.error('[Webhook] Error storing result:', err);
          }
        } else {
          console.log('[Webhook] No parseable result found in message');
        }
      }

      return NextResponse.json({ success: true, received: true });
    }

    // Handle other event types
    if (body.event_type === 'task_created') {
      console.log(`[Webhook] Task created: ${body.task_detail?.task_id}`);
      return NextResponse.json({ success: true, received: true });
    }

    if (body.event_type === 'task_progress') {
      console.log(`[Webhook] Task progress: ${body.progress_detail?.message}`);
      return NextResponse.json({ success: true, received: true });
    }

    console.log('[Webhook] Unknown event type:', body.event_type);
    return NextResponse.json({ success: true, received: true });
  } catch (error) {
    console.error('[Webhook] Error processing webhook:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Failed to process webhook: ${errorMessage}`, success: false },
      { status: 500 }
    );
  }
}
