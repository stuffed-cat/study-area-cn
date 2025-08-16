import path from 'path';
import dotenv from 'dotenv';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import * as generateSitemapModule from '../src/generate-sitemap';

dotenv.config();

process.env.SITE_URL = 'https://example.com';
process.env.SITE_MAP_OUT_FILE = 'book/sitemap.xml';
process.env.SITE_MAP_CONTENT_DIR = 'book';

describe('generate-sitemap', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    test('should exit if SITE_URL is not set', () => {
        const originalEnv = process.env.SITE_URL;
        process.env.SITE_URL = '';
        const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
        expect(() => generateSitemapModule.main()).toThrow('exit');
        process.env.SITE_URL = originalEnv;
        exitSpy.mockRestore();
    });

    test('walkDir should collect .html files recursively', () => {
        vi.spyOn(fs, 'readdirSync').mockImplementation((dir: string) => {
            if (dir.endsWith('book')) return ['a.html', 'b.txt', 'sub'];
            if (dir.endsWith('sub')) return ['c.html'];
            return [];
        });
        vi.spyOn(fs, 'statSync').mockImplementation((file: string) => ({
            isDirectory: () => file.endsWith('sub'),
        }));
        const result = generateSitemapModule.walkDir('book');
        expect(result).toEqual(['book/a.html', 'book/sub/c.html']);
    });

    test('toUrl should convert file path to site url', () => {
        const url = generateSitemapModule.toUrl(path.join('book', 'a.html'));
        expect(url.endsWith('/a.html')).toBe(true);
        expect(url.startsWith('https://example.com')).toBe(true);
    });

    test('generateSitemap should generate correct xml', () => {
        const urls = ['https://example.com/a.html', 'https://example.com/b.html'];
        const xml = generateSitemapModule.generateSitemap(urls);
        expect(xml).toContain('<urlset');
        expect(xml).toContain('<loc>https://example.com/a.html</loc>');
        expect(xml).toContain('<loc>https://example.com/b.html</loc>');
    });

    test('main should write sitemap file', () => {
        vi.spyOn(fs, 'readdirSync').mockReturnValue(['a.html', 'b.html']);
        vi.spyOn(fs, 'statSync').mockImplementation(() => ({
            isDirectory: () => false
        }));
        vi.spyOn(generateSitemapModule, 'toUrl').mockImplementation((file: string) => {
            return 'https://example.com/' + path.basename(file);
        });
        vi.spyOn(generateSitemapModule, 'generateSitemap').mockReturnValue('<xml></xml>');
        const writeSpy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        generateSitemapModule.main();
        expect(writeSpy).toHaveBeenCalled();
        logSpy.mockRestore();
    });
});