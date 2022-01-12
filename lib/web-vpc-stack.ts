import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";

export interface props extends StackProps {
  projectName: String;
  envName: String;
}

export class CmVpcStack extends Stack {
  public readonly vpc: ec2.IVpc;

  constructor(scope: Construct, id: string, props: props) {
    super(scope, id, props);

    /**
     * Create Vpc
     */
    this.vpc = new ec2.Vpc(this, `${props.projectName}-${props.envName}-vpc`, {
      cidr: "10.0.0.0/16",
      maxAzs: 3,
      natGateways: 3, 
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: `${props.projectName}-${props.envName}-public`,
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: `${props.projectName}-${props.envName}-private_with_nat`,
          subnetType: ec2.SubnetType.PRIVATE_WITH_NAT,
        },
        {
          cidrMask: 24,
          name: `${props.projectName}-${props.envName}-private_isolated`,
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });
  }
}
