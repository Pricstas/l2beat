import {
  EthereumAddress,
  ProjectId,
  UnixTime,
  formatSeconds,
} from '@l2beat/shared-pure'

import {
  CONTRACTS,
  DA_BRIDGES,
  DA_LAYERS,
  DA_MODES,
  EXITS,
  FORCE_TRANSACTIONS,
  NEW_CRYPTOGRAPHY,
  NUGGETS,
  OPERATOR,
  RISK_VIEW,
  STATE_CORRECTNESS,
  TECHNOLOGY_DATA_AVAILABILITY,
  addSentimentToDataAvailability,
} from '../../common'
import { formatDelay } from '../../common/formatDelays'
import { ProjectDiscovery } from '../../discovery/ProjectDiscovery'
import {
  getCommittee,
  getProxyGovernance,
  getSHARPVerifierContracts,
  getSHARPVerifierGovernors,
  getSHARPVerifierUpgradeDelay,
} from '../../discovery/starkware'
import { delayDescriptionFromString } from '../../utils/delayDescription'
import { Badge } from '../badges'
import { Layer2 } from './types'

const discovery = new ProjectDiscovery('deversifi')
const upgradeDelaySeconds = discovery.getContractValue<number>(
  'StarkExchange',
  'StarkWareDiamond_upgradeDelay',
)
const includingSHARPUpgradeDelaySeconds = Math.min(
  upgradeDelaySeconds,
  getSHARPVerifierUpgradeDelay(),
)
const upgradeDelay = formatSeconds(upgradeDelaySeconds)
const verifierAddress = discovery.getAddressFromValue(
  'GpsFactRegistryAdapter',
  'gpsContract',
)

const freezeGracePeriod = discovery.getContractValue<number>(
  'StarkExchange',
  'FREEZE_GRACE_PERIOD',
)

const committee = getCommittee(discovery)

export const rhinofi: Layer2 = {
  type: 'layer2',
  id: ProjectId('deversifi'),
  createdAt: new UnixTime(1623153328), // 2021-06-08T11:55:28Z
  badges: [
    Badge.VM.AppChain,
    Badge.DA.DAC,
    Badge.Stack.StarkEx,
    Badge.Infra.SHARP,
  ],
  display: {
    name: 'rhino.fi',
    slug: 'rhinofi',
    description: 'rhino.fi is a Validium based on the StarkEx technology.',
    purposes: ['Exchange'],
    provider: 'StarkEx',
    category: 'Validium',
    links: {
      websites: ['https://rhino.fi/'],
      apps: ['https://app.rhino.fi/'],
      documentation: [
        'https://docs.rhino.fi/',
        'https://support.rhino.fi/en/',
        'https://docs.starkware.co/starkex/index.html',
      ],
      explorers: [],
      repositories: [
        'https://github.com/starkware-libs/starkex-contracts',
        'https://github.com/rhinofi',
      ],
      socialMedia: [
        'https://rhino.fi/blog',
        'https://twitter.com/rhinofi',
        'https://linkedin.com/company/rhinofi/',
        'https://youtube.com/c/rhinofi',
        'https://discord.com/invite/26sXx2KAhy',
      ],
    },
    activityDataSource: 'Closed API',
  },
  stage: {
    stage: 'NotApplicable',
  },
  config: {
    associatedTokens: ['DVF'],
    escrows: [
      {
        address: EthereumAddress('0x5d22045DAcEAB03B158031eCB7D9d06Fad24609b'),
        sinceTimestamp: new UnixTime(1590491810),
        tokens: '*',
        chain: 'ethereum',
      },
    ],
    transactionApi: {
      type: 'starkex',
      product: ['rhinofi'],
      sinceTimestamp: new UnixTime(1590491810),
      resyncLastDays: 7,
    },
    // trackedTxs: [
    //   {
    //     uses: [
    //       { type: 'liveness', subtype: 'stateUpdates' },
    //       { type: 'l2costs', subtype: 'stateUpdates' },
    //     ],
    //     query: {
    //       formula: 'functionCall',
    //       address: EthereumAddress(
    //         '0x5d22045DAcEAB03B158031eCB7D9d06Fad24609b',
    //       ),
    //       selector: '0x538f9406',
    //       functionSignature:
    //         'function updateState(uint256[] publicInput, uint256[] applicationData)',
    //       sinceTimestampInclusive: new UnixTime(1590491810),
    //     },
    //   },
    // ],
  },
  dataAvailability: [
    addSentimentToDataAvailability({
      layers: [DA_LAYERS.DAC],
      bridge: DA_BRIDGES.DAC_MEMBERS({
        membersCount: committee.accounts.length,
        requiredSignatures: committee.minSigners,
      }),
      mode: DA_MODES.STATE_DIFFS,
    }),
  ],
  riskView: {
    stateValidation: RISK_VIEW.STATE_ZKP_ST,
    dataAvailability: {
      ...RISK_VIEW.DATA_EXTERNAL_DAC({
        membersCount: committee.accounts.length,
        requiredSignatures: committee.minSigners,
      }),
      sources: [
        {
          contract: 'StarkExchange',
          references: [
            'https://etherscan.io/address/0x67e198743BC19fa4757720eDd0e769f8291e1F1D#code#F34#L183',
          ],
        },
        {
          contract: 'Committee',
          references: [
            'https://etherscan.io/address/0x28780349A33eEE56bb92241bAAB8095449e24306#code#F1#L63',
          ],
        },
      ],
    },
    exitWindow: RISK_VIEW.EXIT_WINDOW(
      includingSHARPUpgradeDelaySeconds,
      freezeGracePeriod,
      { existsBlocklist: true },
    ),
    sequencerFailure: {
      ...RISK_VIEW.SEQUENCER_FORCE_VIA_L1(freezeGracePeriod),
      secondLine: formatDelay(freezeGracePeriod),
    },
    proposerFailure: RISK_VIEW.PROPOSER_USE_ESCAPE_HATCH_MP,
  },
  technology: {
    stateCorrectness: STATE_CORRECTNESS.STARKEX_VALIDITY_PROOFS,
    newCryptography: NEW_CRYPTOGRAPHY.ZK_STARKS,
    dataAvailability: TECHNOLOGY_DATA_AVAILABILITY.STARKEX_OFF_CHAIN,
    operator: OPERATOR.STARKEX_OPERATOR,
    forceTransactions: FORCE_TRANSACTIONS.STARKEX_SPOT_WITHDRAW(),
    exitMechanisms: [...EXITS.STARKEX_PERPETUAL, EXITS.STARKEX_BLOCKLIST],
  },
  contracts: {
    addresses: [
      discovery.getContractDetails('StarkExchange'),
      discovery.getContractDetails(
        'Committee',
        'Data Availability Committee (DAC) contract verifying data availability claim from DAC Members (via multisig check).',
      ),
      ...getSHARPVerifierContracts(discovery, verifierAddress),
    ],
    risks: [
      CONTRACTS.UPGRADE_WITH_DELAY_SECONDS_RISK(
        includingSHARPUpgradeDelaySeconds,
      ),
    ],
  },
  permissions: [
    {
      name: 'Governors',
      accounts: getProxyGovernance(discovery, 'StarkExchange'),
      description:
        'Can upgrade the implementation of the system, potentially gaining access to all funds stored in the bridge. ' +
        delayDescriptionFromString(upgradeDelay),
    },
    ...discovery.getMultisigPermission(
      'GovernanceMultisig',
      'Has full power to upgrade the bridge implementation as a Governor.',
    ),
    committee,
    ...getSHARPVerifierGovernors(discovery, verifierAddress),
    {
      name: 'Operators',
      accounts: discovery.getPermissionedAccounts('StarkExchange', 'OPERATORS'),
      description:
        'Allowed to update the state of the system. When the Operator is down the state cannot be updated.',
    },
    discovery.contractAsPermissioned(
      // this multisig does not get recognized as such (because of the old proxy?)
      discovery.getContract('DeversiFiTreasuryMultisig'),
      'Is the BlockAdmin: Can add owner keys to a blocklist in the bridge, blocking their withdrawals on L1. After 2 weeks, this multisig can manually withdraw even for blocked actors.',
    ),
  ],
  milestones: [
    {
      name: 'Rebranding',
      date: '2022-07-13T00:00:00Z',
      link: 'https://rhino.fi/blog/introducing-rhino-fi-the-first-frictionless-gateway-to-multi-chain-defi/',
      description:
        'DeversiFi becomes rhino.fi: multi-chain platform gathering DeFi in one place.',
      type: 'general',
    },
    {
      name: 'DeversiFi Relaunched using Starkware',
      date: '2020-06-03T00:00:00Z',
      link: 'https://rhino.fi/blog/introducing-rhino-fi-the-first-frictionless-gateway-to-multi-chain-defi/',
      description:
        'DeversiFi is live, bringing first STARKex Validium for spot trading.',
      type: 'general',
    },
  ],
  knowledgeNuggets: [...NUGGETS.STARKWARE],
}
