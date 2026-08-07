<?php

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../lib/ScrapeHtml.php';

final class ScrapeHtmlTest extends TestCase
{
    public function testExtractsFromTheFetchedHtml(): void
    {
        $result = scrape_html(
            'https://example.com',
            fn() => '<html><body><a href="/foo">Foo</a></body></html>',
            fn(DOMXPath $xpath) => trim($xpath->query('//a')->item(0)->textContent),
            null,
            'test',
        );

        $this->assertSame('Foo', $result);
    }

    public function testReturnsTheDefaultWhenTheFetchFails(): void
    {
        $extractCalls = 0;

        $result = scrape_html(
            'https://example.com',
            fn() => null,
            function (DOMXPath $xpath) use (&$extractCalls) {
                $extractCalls++;
                return 'should not happen';
            },
            'fallback',
            'test',
        );

        $this->assertSame('fallback', $result);
        $this->assertSame(0, $extractCalls, 'a failed fetch must not invoke extract at all');
    }

    public function testReturnsTheDefaultWhenExtractThrows(): void
    {
        $result = scrape_html(
            'https://example.com',
            fn() => '<html><body>no matching markup</body></html>',
            fn(DOMXPath $xpath) => throw new RuntimeException('unexpected markup'),
            'fallback',
            'test',
        );

        $this->assertSame('fallback', $result);
    }
}
