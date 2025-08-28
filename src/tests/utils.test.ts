describe('Utils Tests', () => {
  test('should pass basic test', () => {
    expect(1 + 1).toBe(2);
  });

  test('should handle string operations', () => {
    const testString = 'workflow-automation';
    expect(testString.split('-')).toEqual(['workflow', 'automation']);
  });

  test('should handle async operations', async () => {
    const promise = Promise.resolve('test');
    const result = await promise;
    expect(result).toBe('test');
  });
});