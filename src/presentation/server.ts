import config from 'config';
import { buildApp } from './index';
import { MdsSdk } from '@maddonkeysoftware/mds-cloud-sdk-node';

void (async () => {
  const mdsSdkConfig = config.get<Record<string, unknown>>('mdsSdk');
  await MdsSdk.initialize(mdsSdkConfig);

  const port = config.get<number>('apiPort');
  const app = await buildApp();

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
    console.error(err);
    process.exit(1);
  }
})();
