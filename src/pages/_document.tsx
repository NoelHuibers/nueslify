import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <title>Nueslify</title>
        <meta
          name="description"
          content="Enhance your radio experience with Nueslify, the innovative web application seamlessly integrated with Spotify."
        />
      </Head>

      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black" />
      <meta name="theme-color" content="#000000" />

      <link rel="apple-touch-icon" href="/icon.png" />
      <link rel="manifest" href="/manifest.json" />

      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
