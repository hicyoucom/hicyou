import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { encoded: string } }
) {
  try {
    // Decode the URL
    const decodedUrl = decodeURIComponent(params.encoded);
    
    // Validate URL format
    if (!decodedUrl.startsWith('http://') && !decodedUrl.startsWith('https://')) {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Create response with 301 redirect
    const response = NextResponse.redirect(decodedUrl, 301);
    
    // Add X-Robots-Tag header to prevent search engine indexing
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    
    return response;
  } catch (error) {
    console.error('Error decoding URL:', error);
    return NextResponse.json(
      { error: 'Invalid encoded URL' },
      { status: 400 }
    );
  }
}

