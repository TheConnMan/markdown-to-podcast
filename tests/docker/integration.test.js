import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

describe('Docker Container Integration', () => {
  const containerName = 'test-podcast-container';
  
  afterEach(async () => {
    try {
      await execAsync(`docker stop ${containerName}`);
      await execAsync(`docker rm ${containerName}`);
    } catch (error) {
      // Container might not exist
    }
  });

  test('container starts successfully', async () => {
    const { stdout } = await execAsync(`
      docker run -d --name ${containerName} -p 3003:3000 \\
        -e NODE_ENV=test \\
        -e API_KEY=test-key \\
        -e PODCAST_UUID=test-uuid \\
        markdown-to-podcast:latest
    `);
    
    expect(stdout.trim()).toMatch(/^[a-f0-9]{64}$/); // Container ID
    
    // Wait for container to be ready
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const { stdout: healthCheck } = await execAsync('curl -f http://localhost:3003/health');
    expect(healthCheck).toContain('ok');
  }, 30000);

  test('container handles volume mounts', async () => {
    await execAsync(`
      docker run -d --name ${containerName} -p 3004:3000 \\
        -v $(pwd)/test-data:/app/data \\
        -e NODE_ENV=test \\
        -e API_KEY=test-key \\
        -e PODCAST_UUID=test-uuid \\
        markdown-to-podcast:latest
    `);
    
    // Wait for container to be ready
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Test that data directory is accessible
    const { stdout } = await execAsync(`docker exec ${containerName} ls -la /app/data`);
    expect(stdout).toContain('total');
  }, 30000);
});