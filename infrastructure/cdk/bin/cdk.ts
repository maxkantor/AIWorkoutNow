#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AIWorkoutNowStack } from '../lib/aiworkoutnow-stack';

const app = new cdk.App();

new AIWorkoutNowStack(app, 'AIWorkoutNowStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  tablePrefix: process.env.TABLE_PREFIX || 'AIWorkoutNow',
  description: 'AIWorkoutNow Infrastructure - DynamoDB Tables, SSM Parameters, and IAM Roles',
});
