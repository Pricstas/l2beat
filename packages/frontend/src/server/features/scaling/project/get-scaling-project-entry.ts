import {
  type Layer2,
  type Layer3,
  badgesCompareFn,
  layer2s,
} from '@l2beat/config'
import { getContractsVerificationStatuses } from '@l2beat/config'
import { getManuallyVerifiedContracts } from '@l2beat/config'
import { getProjectsVerificationStatuses } from '@l2beat/config'
import { compact } from 'lodash'
import { env } from '~/env'
import { getProjectLinks } from '~/utils/project/get-project-links'
import { getUnderReviewStatus } from '~/utils/project/under-review'
import { getProjectsChangeReport } from '../../projects-change-report/get-projects-change-report'
import { getActivityProjectStats } from '../activity/get-activity-project-stats'
import { getTvlProjectStats } from '../tvl/get-tvl-project-stats'
import { getAssociatedTokenWarning } from '../tvl/utils/get-associated-token-warning'
import { getCountdowns } from '../utils/get-countdowns'
import { getL2ProjectDetails } from './utils/get-l2-project-details'
import { getL3ProjectDetails } from './utils/get-l3-project-details'
import { getScalingRosetteValues } from './utils/get-scaling-rosette-values'

type ScalingProject = Layer2 | Layer3

export type ScalingProjectEntry = Awaited<
  ReturnType<typeof getScalingProjectEntry>
>

export async function getScalingProjectEntry(project: ScalingProject) {
  const [
    contractsVerificationStatuses,
    manuallyVerifiedContracts,
    projectsChangeReport,
    header,
  ] = await Promise.all([
    getContractsVerificationStatuses(project),
    getManuallyVerifiedContracts(project),
    getProjectsChangeReport(),
    getHeader(project),
  ])

  const isVerified = getProjectsVerificationStatuses(project)
  const changes = projectsChangeReport.getChanges(project.id)

  const common = {
    type: project.type,
    name: project.display.name,
    slug: project.display.slug,
    underReviewStatus: getUnderReviewStatus({
      isUnderReview: !!project.isUnderReview,
      ...changes,
    }),
    isArchived: !!project.isArchived,
    isUpcoming: !!project.isUpcoming,
    header,
    countdowns: getCountdowns(project),
  }

  const rosetteValues = getScalingRosetteValues(project.riskView)

  if (project.type === 'layer2') {
    const projectDetails = await getL2ProjectDetails({
      project,
      isVerified,
      contractsVerificationStatuses,
      manuallyVerifiedContracts,
      projectsChangeReport,
      rosetteValues,
    })

    return {
      ...common,
      type: project.type,
      stageConfig: project.stage,
      projectDetails,
      header,
    }
  }

  // L3
  const hostChain = layer2s.find((layer2) => layer2.id === project.hostChain)
  const baseLayerRosetteValues = hostChain
    ? getScalingRosetteValues(hostChain.riskView)
    : undefined
  const stackedRosetteValues = project.stackedRiskView
    ? getScalingRosetteValues(project.stackedRiskView)
    : undefined
  const isHostChainVerified =
    hostChain === undefined ? false : getProjectsVerificationStatuses(hostChain)

  const projectDetails = await getL3ProjectDetails({
    project,
    hostChain,
    isVerified,
    rosetteValues,
    isHostChainVerified,
    manuallyVerifiedContracts,
    projectsChangeReport,
    contractsVerificationStatuses,
    combinedRosetteValues: stackedRosetteValues,
    hostChainRosetteValues: baseLayerRosetteValues,
  })

  return {
    ...common,
    type: project.type,
    stageConfig: {
      stage: 'NotApplicable' as const,
    },
    baseLayerRosetteValues,
    stackedRosetteValues,
    hostChainName: hostChain?.display.name,
    projectDetails,
  }
}

async function getHeader(project: ScalingProject) {
  const [activityProjectStats, tvlProjectStats] = await Promise.all([
    getActivityProjectStats(project.id),
    getTvlProjectStats(project),
  ])

  const associatedTokens = project.config.associatedTokens ?? []
  return {
    description: project.display.description,
    warning: project.display.headerWarning,
    category: project.display.category,
    isOther: !!project.display.reasonsForBeingOther,
    purposes: project.display.purposes,
    activity: activityProjectStats,
    rosetteValues: getScalingRosetteValues(project.riskView),
    links: getProjectLinks(project.display.links),
    hostChain:
      project.type === 'layer3'
        ? (layer2s.find((l) => l.id === project.hostChain)?.display.name ??
          project.hostChain)
        : undefined,
    tvl:
      !env.EXCLUDED_TVL_PROJECTS?.includes(project.id.toString()) &&
      tvlProjectStats
        ? {
            tokenBreakdown: {
              ...tvlProjectStats.tokenBreakdown,
              warnings: compact([
                tvlProjectStats.tokenBreakdown.total > 0 &&
                  getAssociatedTokenWarning({
                    associatedRatio:
                      tvlProjectStats.tokenBreakdown.associated /
                      tvlProjectStats.tokenBreakdown.total,
                    name: project.display.name,
                    associatedTokens,
                  }),
              ]),
              associatedTokens,
            },
            tvlBreakdown: {
              ...tvlProjectStats.tvlBreakdown,
              warning: project.display.tvlWarning,
            },
          }
        : undefined,
    badges:
      project.badges && project.badges.length !== 0
        ? project.badges?.sort(badgesCompareFn)
        : undefined,
  }
}
