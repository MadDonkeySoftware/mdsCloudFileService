import config from 'config';
import { buildApp } from './index';
import { MdsSdk } from '@maddonkeysoftware/mds-cloud-sdk-node';

void (async () => {
  const mdsSdkConfig = config.get<Record<string, unknown>>('mdsSdk');
  await MdsSdk.initialize(mdsSdkConfig);

  const port = config.get<number>('apiPort');
  const app = await buildApp();

  const uploadFolder = config.get<string>('uploadFolder');
  if (!uploadFolder) {
    throw new Error('Configuration error: uploadFolder is not defined');
  }

  try {
    const address = await app.listen({ port, host: '::' });

    app.log.info(
      app.printRoutes({
        includeHooks: false,
        includeMeta: ['metaProperty'],
      }),
    );

    app.log.info(`Server listening at ${address}`);
  } catch (err) {
    app.log.error(err, 'Failed to start server');
    console.error(err);
    process.exit(1);
  }
})();
