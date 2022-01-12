import { CfnOutput, SecretValue, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";

export interface props extends StackProps {
  projectName: String;
  envName: String;
  vpc: ec2.IVpc;
  asgSg: ec2.ISecurityGroup;
}

export class CmRdsStack extends Stack {
  constructor(scope: Construct, id: string, props: props) {
    super(scope, id, props);

    /**
     * Create a SecurityGroup to attach to a rds
     */
    const rdsSg = new ec2.SecurityGroup(
      this,
      `${props.projectName}-${props.envName}-rdssg`,
      {
        vpc: props.vpc,
        securityGroupName: `${props.projectName}-${props.envName}-rdssg`,
      }
    );
    rdsSg.addIngressRule(props.asgSg, ec2.Port.tcp(3306));

    /**
     * Create a rds
     */
    const mysqlAurora = new rds.DatabaseCluster(
      this,
      `${props.projectName}-${props.envName}-mysql`,
      {
        engine: rds.DatabaseClusterEngine.AURORA_MYSQL,
        instanceProps: {
          vpc: props.vpc,
          vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
          instanceType: ec2.InstanceType.of(
            ec2.InstanceClass.BURSTABLE3,
            ec2.InstanceSize.MEDIUM
          ),
          securityGroups: [rdsSg],
        },
        credentials: rds.Credentials.fromPassword(
          "admin",
          SecretValue.ssmSecure("/param/rds", "1")
        ),
        clusterIdentifier: `${props.projectName}-${props.envName}-mysql`,
        instances: 3
      }
    );

    /**
     * Define an output
     */
    new CfnOutput(this, "aurora-writer-endpoint", {
      value: mysqlAurora.clusterEndpoint.hostname,
    });
  }
}
