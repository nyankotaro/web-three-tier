import * as fs from "fs";
import * as path from "path";

import { CfnOutput, Duration, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as autoscaling from "aws-cdk-lib/aws-autoscaling";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ssm from "aws-cdk-lib/aws-ssm";

export interface props extends StackProps {
  projectName: String;
  envName: String;
  vpc: ec2.IVpc;
}

export class CmWebStack extends Stack {
  public readonly asgSg: ec2.ISecurityGroup;

  constructor(scope: Construct, id: string, props: props) {
    super(scope, id, props);

    /**
     * Create a role to attach to an autoscaling
     */
    const role = new iam.Role(
      this,
      `${props.projectName}-${props.envName}-role`,
      {
        assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            "AmazonSSMManagedInstanceCore"
          ),
        ],
        roleName: `${props.projectName}-${props.envName}-role`,
      }
    );

    /**
     * Create a SecurityGroups to attach to an alb
     */
    const albSg = new ec2.SecurityGroup(
      this,
      `${props.projectName}-${props.envName}-albsg`,
      {
        vpc: props.vpc,
        securityGroupName: `${props.projectName}-${props.envName}-albsg`,
      }
    );
    albSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80));

    /**
     * Create a SecurityGroups to attach to an autoscaling
     */
    this.asgSg = new ec2.SecurityGroup(
      this,
      `${props.projectName}-${props.envName}-asgsg`,
      {
        vpc: props.vpc,
        securityGroupName: `${props.projectName}-${props.envName}-asgsg`,
      }
    );

    /**
     * Create an AutoScaling
     */
    const asg = new autoscaling.AutoScalingGroup(
      this,
      `${props.projectName}-${props.envName}-asg`,
      {
        instanceType: ec2.InstanceType.of(
          ec2.InstanceClass.T3,
          ec2.InstanceSize.MICRO
        ),
        machineImage: ec2.MachineImage.fromSsmParameter(`${props.projectName}-${props.envName}-ssmparameter`),
        vpc: props.vpc,
        vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_NAT },
        autoScalingGroupName: `${props.projectName}-${props.envName}-asg`,
        desiredCapacity: 3,
        maxCapacity: 3,
        minCapacity: 3,
        healthCheck: autoscaling.HealthCheck.elb({grace: Duration.seconds(30)}),
        securityGroup: this.asgSg,
        role: role,
        updatePolicy: autoscaling.UpdatePolicy.rollingUpdate({
          maxBatchSize: 2,
          minInstancesInService: 1
        })
      }
    );

    /**
     * Create a Application load balancer
     */
    const alb = new elbv2.ApplicationLoadBalancer(
      this,
      `${props.projectName}-${props.envName}-alb`,
      {
        vpc: props.vpc,
        internetFacing: true,
        securityGroup: albSg,
        loadBalancerName: `${props.projectName}-${props.envName}-alb`,
      }
    );

    const listener = alb.addListener(
      `${props.projectName}-${props.envName}-listener`,
      {
        port: 80,
        open: true,
      }
    );

    listener.addTargets(`${props.projectName}-${props.envName}-targets`, {
      healthCheck: {
        path: "/index.html",
        healthyHttpCodes: "200",
      },
      port: 80,
      targets: [asg],
      targetGroupName: `${props.projectName}-${props.envName}-targets`,
    });

    /**
     * Define an output
     */
    new CfnOutput(this, "alb-dnsname", {
      value: alb.loadBalancerDnsName,
    });
  }
}
