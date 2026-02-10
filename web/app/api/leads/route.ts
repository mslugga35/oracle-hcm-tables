import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, company, oracleModule, message } = body;

    // Validate required fields
    if (!name || !email || !company || !oracleModule || !message) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Create lead entry
    const leadEntry = {
      id: Date.now().toString(),
      name,
      email,
      company,
      oracleModule,
      message,
      timestamp: new Date().toISOString(),
      source: 'hcm-tables-website'
    };

    // Ensure data directory exists
    const dataDir = path.join(process.cwd(), '..', '..', 'data');
    try {
      await fs.mkdir(dataDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    // Read existing leads or create empty array
    const leadsFile = path.join(dataDir, 'leads.json');
    let leads = [];
    
    try {
      const existingData = await fs.readFile(leadsFile, 'utf8');
      leads = JSON.parse(existingData);
    } catch (error) {
      // File doesn't exist or is empty, start with empty array
    }

    // Add new lead
    leads.push(leadEntry);

    // Write back to file
    await fs.writeFile(leadsFile, JSON.stringify(leads, null, 2));

    return NextResponse.json({ success: true, message: 'Lead captured successfully' });
  } catch (error) {
    console.error('Error saving lead:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}