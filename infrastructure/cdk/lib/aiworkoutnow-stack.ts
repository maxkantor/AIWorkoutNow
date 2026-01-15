import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

export interface AIWorkoutNowStackProps extends cdk.StackProps {
  tablePrefix?: string;
}

export class AIWorkoutNowStack extends cdk.Stack {
  public readonly lambdaExecutionRole: iam.Role;
  public readonly workoutsTable: dynamodb.Table;
  public readonly anonymousUsageTable: dynamodb.Table;
  public readonly userTokensTable: dynamodb.Table;
  public readonly progressLogsTable: dynamodb.Table;
  public readonly adminUsersTable: dynamodb.Table;
  public readonly contactMessagesTable: dynamodb.Table;
  public readonly emailVerificationTable: dynamodb.Table;
  public readonly emailVisitorMappingTable: dynamodb.Table;
  public readonly contactRepliesTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props: AIWorkoutNowStackProps = {}) {
    super(scope, id, props);

    const tablePrefix = props.tablePrefix || 'AIWorkoutNow';

    // DynamoDB Tables
    this.workoutsTable = new dynamodb.Table(this, 'WorkoutsTable', {
      tableName: `${tablePrefix}-Workouts`,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: 'WorkoutId', type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    cdk.Tags.of(this.workoutsTable).add('TablePrefix', tablePrefix);

    this.anonymousUsageTable = new dynamodb.Table(this, 'AnonymousUsageTable', {
      tableName: `${tablePrefix}-AnonymousUsage`,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: 'DeviceId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'Date', type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    cdk.Tags.of(this.anonymousUsageTable).add('TablePrefix', tablePrefix);

    this.userTokensTable = new dynamodb.Table(this, 'UserTokensTable', {
      tableName: `${tablePrefix}-UserTokens`,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: 'DeviceId', type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    cdk.Tags.of(this.userTokensTable).add('TablePrefix', tablePrefix);

    this.progressLogsTable = new dynamodb.Table(this, 'ProgressLogsTable', {
      tableName: `${tablePrefix}-ProgressLogs`,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: 'DeviceId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'Timestamp', type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    cdk.Tags.of(this.progressLogsTable).add('TablePrefix', tablePrefix);

    this.adminUsersTable = new dynamodb.Table(this, 'AdminUsersTable', {
      tableName: `${tablePrefix}-AdminUsers`,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: 'AdminId', type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    cdk.Tags.of(this.adminUsersTable).add('TablePrefix', tablePrefix);

    // Add GSI for Email lookup
    this.adminUsersTable.addGlobalSecondaryIndex({
      indexName: 'EmailIndex',
      partitionKey: { name: 'Email', type: dynamodb.AttributeType.STRING },
    });

    this.contactMessagesTable = new dynamodb.Table(this, 'ContactMessagesTable', {
      tableName: `${tablePrefix}-ContactMessages`,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: 'MessageId', type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    cdk.Tags.of(this.contactMessagesTable).add('TablePrefix', tablePrefix);

    // Email verification tables (required for Restore Credits)
    this.emailVerificationTable = new dynamodb.Table(this, 'EmailVerificationTable', {
      tableName: `${tablePrefix}-EmailVerification`,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: 'Email', type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    cdk.Tags.of(this.emailVerificationTable).add('TablePrefix', tablePrefix);

    this.emailVisitorMappingTable = new dynamodb.Table(this, 'EmailVisitorMappingTable', {
      tableName: `${tablePrefix}-EmailVisitorMapping`,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: 'Email', type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    cdk.Tags.of(this.emailVisitorMappingTable).add('TablePrefix', tablePrefix);

    // Contact replies table (admin reply history)
    this.contactRepliesTable = new dynamodb.Table(this, 'ContactRepliesTable', {
      tableName: `${tablePrefix}-ContactReplies`,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: 'ReplyId', type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    cdk.Tags.of(this.contactRepliesTable).add('TablePrefix', tablePrefix);

    // Lambda Execution Role
    this.lambdaExecutionRole = new iam.Role(this, 'LambdaExecutionRole', {
      roleName: `${tablePrefix}-LambdaExecutionRole`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // DynamoDB Permissions
    this.lambdaExecutionRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'dynamodb:PutItem',
          'dynamodb:GetItem',
          'dynamodb:UpdateItem',
          'dynamodb:DeleteItem',
          'dynamodb:Query',
          'dynamodb:Scan',
        ],
        resources: [
          this.workoutsTable.tableArn,
          this.anonymousUsageTable.tableArn,
          this.userTokensTable.tableArn,
          this.progressLogsTable.tableArn,
          this.adminUsersTable.tableArn,
          this.contactMessagesTable.tableArn,
          this.emailVerificationTable.tableArn,
          this.emailVisitorMappingTable.tableArn,
          this.contactRepliesTable.tableArn,
        ],
      })
    );

    // SSM Parameter Store Permissions
    this.lambdaExecutionRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['ssm:GetParameter', 'ssm:GetParameters'],
        resources: [
          `arn:aws:ssm:${this.region}:${this.account}:parameter/aiworkoutnow/*`,
          `arn:aws:ssm:${this.region}:${this.account}:parameter/${tablePrefix}/*`,
        ],
      })
    );

    // SES Permissions
    this.lambdaExecutionRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['ses:SendEmail', 'ses:SendRawEmail'],
        resources: ['*'],
      })
    );

    // SSM Parameters (placeholders - values should be set manually)
    // Note: SecureString parameters should be created manually via AWS CLI or Console
    new ssm.StringParameter(this, 'OpenAIApiKeyParameter', {
      parameterName: '/aiworkoutnow/openai-api-key',
      stringValue: 'CHANGE_ME',
      description: 'OpenAI API Key - Update this to a SecureString via AWS CLI',
    });

    new ssm.StringParameter(this, 'SESFromEmailParameter', {
      parameterName: '/aiworkoutnow/ses-from-email',
      stringValue: 'noreply@aiworkoutnow.com',
      description: 'SES From Email Address',
    });

    new ssm.StringParameter(this, 'SESAdminEmailParameter', {
      parameterName: '/aiworkoutnow/ses-admin-email',
      stringValue: 'admin@aiworkoutnow.com',
      description: 'SES Admin Email Address',
    });

    new ssm.StringParameter(this, 'JWTSecretParameter', {
      parameterName: '/aiworkoutnow/jwt-secret',
      stringValue: 'CHANGE_ME',
      description: 'JWT Secret Key - Update this to a SecureString via AWS CLI',
    });

    // Outputs
    new cdk.CfnOutput(this, 'LambdaExecutionRoleArn', {
      value: this.lambdaExecutionRole.roleArn,
      description: 'ARN of the Lambda execution role',
      exportName: `${this.stackName}-LambdaExecutionRoleArn`,
    });

    new cdk.CfnOutput(this, 'WorkoutsTableName', {
      value: this.workoutsTable.tableName,
      description: 'Name of the Workouts table',
      exportName: `${this.stackName}-WorkoutsTable`,
    });

    new cdk.CfnOutput(this, 'TablePrefix', {
      value: tablePrefix,
      description: 'Table name prefix',
    });
  }
}

