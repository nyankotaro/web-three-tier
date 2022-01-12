#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as iam from "aws-cdk-lib/aws-iam";
import { CmVpcStack } from '../lib/web-vpc-stack';
import { CmImagebuilderStack } from '../lib/web-imagebuilder-stack';
import { CmWebStack } from '../lib/web-web-stack';
import { CmRdsStack } from '../lib/web-rds-stack';

const app = new cdk.App();
const projectName = app.node.tryGetContext('projectName')
const envKey = app.node.tryGetContext('environment')
const envValues = app.node.tryGetContext(envKey)
const env = { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }

const cmVpcStack = new CmVpcStack(app, `${projectName}-${envValues.envName}-vpc-stack`, {
  projectName: projectName,
  envName: envValues.envName,
  env: env,
});
const cmImagebuilderStack = new CmImagebuilderStack(app, `${projectName}-${envValues.envName}-imagebuilder-stack`, {
  projectName: projectName,
  envName: envValues.envName,
  vpc: cmVpcStack.vpc,
  env: env,
});
const cmWebStack = new CmWebStack(app, `${projectName}-${envValues.envName}-web-stack`, {
  projectName: projectName,
  envName: envValues.envName,
  vpc: cmVpcStack.vpc,
  env: env,
});
cmWebStack.addDependency(cmImagebuilderStack)
new CmRdsStack(app, `${projectName}-${envValues.envName}-rds-stack`, {
  projectName: projectName,
  envName: envValues.envName,
  vpc: cmVpcStack.vpc,
  asgSg: cmWebStack.asgSg,
  env: env,
});

// Uncomment if you want to use the permission boundary
const permissionsBoundary = iam.ManagedPolicy.fromManagedPolicyName(
  cmVpcStack,
  'PermissionsBoundary',
  'adm_skill-up_scope-permissions',
);
iam.PermissionsBoundary.of(app).apply(permissionsBoundary);
cdk.Tags.of(app).add('Owner', 'user')