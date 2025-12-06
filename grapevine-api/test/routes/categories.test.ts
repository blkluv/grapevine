import { describe, it, expect, beforeEach } from 'vitest';
import { app } from '../../src/index.js';
import { testPool } from '../setup.js';
import { createTestCategory, createTestWallet, createTestFeed } from '../helpers/factories.js';
import { expectValidUUID, expectValidEpochTimestamp } from '../helpers/assertions.js';

/**
 * Categories API Tests
 * Tests the category management endpoints using app.request()
 */

describe('Categories API', () => {
  let testCategory: any;

  beforeEach(async () => {
    testCategory = await createTestCategory(testPool);
  });

  describe('GET /v1/categories', () => {
    it('should retrieve cursor-paginated list of categories', async () => {
      // Create additional categories
      await createTestCategory(testPool, { name: 'food' });
      await createTestCategory(testPool, { name: 'money' });

      const response = await app.request('/v1/categories?page_size=20');
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('pagination');
      expect(data.pagination).toHaveProperty('page_size');
      expect(data.pagination).toHaveProperty('next_page_token');
      expect(data.pagination).toHaveProperty('has_more');
      expect(data.data.length).toBeGreaterThanOrEqual(3);

      const category = data.data[0];
      expectValidUUID(category.id);
      expect(category.name).toBeTruthy();
      expect(typeof category.is_active).toBe('boolean');
      expectValidEpochTimestamp(category.created_at);
      expectValidEpochTimestamp(category.updated_at);
    });

    it('should filter categories by is_active status', async () => {
      // Create active and inactive categories
      const activeCategory = await createTestCategory(testPool, { name: 'relationships' });
      const inactiveCategory = await createTestCategory(testPool, { name: 'reviews' });

      // Update one to inactive
      await testPool.query(
        'UPDATE gv_categories SET is_active = false WHERE id = $1',
        [inactiveCategory.id]
      );

      // Query only active categories
      const response = await app.request('/v1/categories?is_active=true');
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.data.length).toBeGreaterThanOrEqual(1);
      data.data.forEach((cat: any) => {
        expect(cat.is_active).toBe(true);
      });

      // Verify inactive category is not in results
      const found = data.data.some((cat: any) => cat.id === inactiveCategory.id);
      expect(found).toBe(false);
    });

    it('should search categories by name', async () => {
      await createTestCategory(testPool, { name: 'musik' });
      await createTestCategory(testPool, { name: 'magic' });
      await createTestCategory(testPool, { name: 'sex' });

      const response = await app.request('/v1/categories?search=magic');
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.data.length).toBe(1);
      data.data.forEach((cat: any) => {
        expect(cat.name.toLowerCase()).toContain('magic');
      });
    });

    it('should order categories alphabetically by name', async () => {
      await createTestCategory(testPool, { name: 'truth' });
      await createTestCategory(testPool, { name: 'healxyz' });
      await createTestCategory(testPool, { name: 'food' });

      const response = await app.request('/v1/categories?page_size=100');
      expect(response.status).toBe(200);

      const data = await response.json();
      for (let i = 1; i < data.data.length; i++) {
        const prevName = data.data[i - 1].name.toLowerCase();
        const currName = data.data[i].name.toLowerCase();
        expect(prevName <= currName).toBe(true);
      }
    });
  });

  describe('GET /v1/categories/:category_id', () => {
    it('should retrieve category by ID', async () => {
      const response = await app.request(`/v1/categories/${testCategory.id}`);
      expect(response.status).toBe(200);

      const category = await response.json();
      expect(category.id).toBe(testCategory.id);
      expect(category.name).toBe(testCategory.name);
      expect(category.description).toBe(testCategory.description);
      expect(category.is_active).toBe(true);
    });

    it('should return 404 for non-existent category', async () => {
      const fakeId = '00000000-0000-4000-8000-000000000000';
      const response = await app.request(`/v1/categories/${fakeId}`);
      expect(response.status).toBe(404);
    });

    it('should retrieve category with all fields', async () => {
      const categoryWithIcon = await createTestCategory(testPool, {
        name: 'reviews',
        description: 'User reviews and ratings',
        icon_url: 'https://example.com/reviews.png',
      });

      const response = await app.request(`/v1/categories/${categoryWithIcon.id}`);
      expect(response.status).toBe(200);

      const category = await response.json();
      expect(category.name).toBe('reviews');
      expect(category.description).toBe('User reviews and ratings');
      expect(category.icon_url).toBe('https://example.com/reviews.png');
      expectValidUUID(category.id);
    });
  });

  // =============================================================================
  // DISABLED: Tests for Create, Update, and Delete endpoints
  // These endpoints are disabled as categories are seeded from the database
  // =============================================================================
});