import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';

import { CmImagebuilderStack } from '../lib/web-imagebuilder-stack'
import { CmRdsStack } from '../lib/web-rds-stack'
import { CmVpcStack } from '../lib/web-vpc-stack';
import { CmWebStack } from '../lib/web-web-stack';

const projectName = 'test'
const envName = 'test'
const env = { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }

test('Snapshot tests', () => {
  const stack = new Stack();
  const cmVpcStack = new CmVpcStack(stack, 'SnapshotTest1', {
    projectName: projectName,
    envName: envName,
    env: env,
  })
  const cmImagebuilderStack = new CmImagebuilderStack(stack, 'SnapshotTest2', {
    projectName: projectName,
    envName: envName,
    vpc: cmVpcStack.vpc,
    env: env,
  })
  const cmWebStack = new CmWebStack(stack, 'SnapshotTest3', {
    projectName: projectName,
    envName: envName,
    vpc: cmVpcStack.vpc,
    env: env,
  });
  const cmRdsStack = new CmRdsStack(stack, 'SnapshotTest4', {
    projectName: projectName,
    envName: envName,
    vpc: cmVpcStack.vpc,
    asgSg: cmWebStack.asgSg,
    env: env,
  });

  expect(Template.fromStack(cmVpcStack).toJSON()).toMatchSnapshot();
  expect(Template.fromStack(cmImagebuilderStack).toJSON()).toMatchSnapshot();
  expect(Template.fromStack(cmWebStack).toJSON()).toMatchSnapshot();
  expect(Template.fromStack(cmRdsStack).toJSON()).toMatchSnapshot();

});
