'use client';

import { useEffect, useState } from 'react';

export default function TestFontPage() {
  const [fontInfo, setFontInfo] = useState<string>('');

  useEffect(() => {
    const computedStyle = window.getComputedStyle(document.body);
    const fontFamily = computedStyle.fontFamily;
    const rootStyle = window.getComputedStyle(document.documentElement);
    const fontVariable = rootStyle.getPropertyValue('--font-plus-jakarta-sans');

    setFontInfo(`
      Body font-family: ${fontFamily}
      CSS Variable value: ${fontVariable || 'Not found'}
    `);
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Font Test Page</h1>

      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-2">
            Current Font Information
          </h2>
          <pre className="bg-gray-100 p-4 rounded text-sm whitespace-pre-wrap">
            {fontInfo}
          </pre>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Font Weight Tests</h2>
          <div className="space-y-2">
            <p className="font-extralight">
              Extra Light (200): The quick brown fox jumps over the lazy dog
            </p>
            <p className="font-light">
              Light (300): The quick brown fox jumps over the lazy dog
            </p>
            <p className="font-normal">
              Normal (400): The quick brown fox jumps over the lazy dog
            </p>
            <p className="font-medium">
              Medium (500): The quick brown fox jumps over the lazy dog
            </p>
            <p className="font-semibold">
              Semibold (600): The quick brown fox jumps over the lazy dog
            </p>
            <p className="font-bold">
              Bold (700): The quick brown fox jumps over the lazy dog
            </p>
            <p className="font-extrabold">
              Extra Bold (800): The quick brown fox jumps over the lazy dog
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Sample Text</h2>
          <p className="mb-4">
            Plus Jakarta Sans is a versatile sans-serif typeface designed for
            modern digital interfaces. It features clean lines, excellent
            readability, and a contemporary aesthetic that works well across
            various screen sizes and resolutions.
          </p>
          <p className="text-sm text-gray-600">
            If you see this text in Plus Jakarta Sans, the font is working
            correctly. Check the browser&apos;s Developer Tools → Network tab to
            confirm the font files are loading.
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">How to Verify</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Open Developer Tools (F12)</li>
            <li>Go to the Network tab</li>
            <li>
              Filter by &quot;Font&quot; or search for &quot;jakarta&quot;
            </li>
            <li>You should see font files being loaded from Google Fonts</li>
            <li>In Elements tab, inspect any text element</li>
            <li>Check Computed styles → font-family</li>
            <li>
              Should show &quot;Plus Jakarta Sans&quot; as the active font
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
