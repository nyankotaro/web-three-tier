import * as fs from "fs";
import * as path from "path";

import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as imagebuilder from "aws-cdk-lib/aws-imagebuilder";
import { Asset } from "aws-cdk-lib/aws-s3-assets";
import * as ssm from "aws-cdk-lib/aws-ssm";

export interface props extends StackProps {
  projectName: String;
  envName: String;
  vpc: ec2.IVpc;
}

export class CmImagebuilderStack extends Stack {
  constructor(scope: Construct, id: string, props: props) {
    super(scope, id, props);

    /**
     * Create iam roles and profiles for imagebuilder
     */
    const role = new iam.Role(
      this,
      `${props.projectName}-${props.envName}-imagebuilder-role`,
      {
        assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            "AmazonSSMManagedInstanceCore"
          ),
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            "EC2InstanceProfileForImageBuilder"
          ),
        ],
        roleName: `${props.projectName}-${props.envName}-imagebuilder-role`,
      }
    );
    const cfnInstanceProfile = new iam.CfnInstanceProfile(
      this,
      `${props.projectName}-${props.envName}-imagebuilder-instanceprofile`,
      {
        roles: [role.roleName],
        instanceProfileName: `${props.projectName}-${props.envName}-imagebuilder-instanceprofile`,
        path: "/",
      }
    );

    /**
     * Upload files for imagebuilder to s3
     */
    const asset = new Asset(
      this,
      `${props.projectName}-${props.envName}-asset`,
      {
        path: path.join(__dirname, "./assets/imagebuilder-data.yaml"),
      }
    );

    /**
     * Imagebuilder settings
     */
    const cfnComponent = new imagebuilder.CfnComponent(
      this,
      `${props.projectName}-${props.envName}-component`,
      {
        name: `${props.projectName}-${props.envName}-component`,
        platform: "Linux",
        version: "1.0.0",
        supportedOsVersions: ["Amazon Linux 2"],
        uri: asset.s3ObjectUrl,
      }
    );
    const cfnImageRecipe = new imagebuilder.CfnImageRecipe(
      this,
      `${props.projectName}-${props.envName}-recipe`,
      {
        name: `${props.projectName}-${props.envName}-recipe`,
        components: [{ componentArn: cfnComponent.ref }],
        parentImage:
          "arn:aws:imagebuilder:ap-northeast-1:aws:image/amazon-linux-2-x86/2021.11.9",
        version: "1.0.0",
      }
    );
    const imagebuilderSg = new ec2.SecurityGroup(this, `${props.projectName}-${props.envName}-imagebuildersg`, {
      vpc: props.vpc,
      allowAllOutbound: true
    });
    const cfnInfraconfig = new imagebuilder.CfnInfrastructureConfiguration(
      this,
      `${props.projectName}-${props.envName}-infraconfig`,
      {
        name: `${props.projectName}-${props.envName}-infraconfig`,
        instanceProfileName: cfnInstanceProfile.ref,
        instanceTypes: ["t3.small"],
        terminateInstanceOnFailure: true,
        subnetId: props.vpc.privateSubnets[0].subnetId,
        securityGroupIds: [ imagebuilderSg.securityGroupId ]
      }
    );
    const cfnImage = new imagebuilder.CfnImage(
      this,
      `${props.projectName}-${props.envName}-image`,
      {
        imageRecipeArn: cfnImageRecipe.ref,
        infrastructureConfigurationArn: cfnInfraconfig.ref,
        imageTestsConfiguration: {
        imageTestsEnabled: false,
        },
      }
    );
    new ssm.StringParameter(
      this,
      `${props.projectName}-${props.envName}-ssmparameter`,
      {
        parameterName: `${props.projectName}-${props.envName}-ssmparameter`,
        stringValue: cfnImage.attrImageId,
        dataType: ssm.ParameterDataType.AWS_EC2_IMAGE,
        type: ssm.ParameterType.STRING,
      }
    );

  }
}
