import { graphql } from "@/graph"

// Every mutation returns the same full selection so the normalized cache
// updates the list and the detail dialog on its own; only operations that
// change list membership (create, cancel, uncancel) refetch the list query.

export const SubscriptionsDoc = graphql(/* GraphQL */ `
  query Subscriptions($includeCanceled: Boolean) {
    subscriptions(includeCanceled: $includeCanceled) {
      id
      name
      registeredOn
      anchorOn
      nextOccurrenceOn
      coveredThroughOn
      intervalMonths
      status
      color
      createdAt
      updatedAt
      templateEntries {
        amount
        kind
        ledgerAccount {
          id
          name
          kind
        }
      }
    }
  }
`)

export const SubscriptionDetailDoc = graphql(/* GraphQL */ `
  query SubscriptionDetail($id: ID!) {
    subscription(id: $id) {
      id
      name
      registeredOn
      anchorOn
      nextOccurrenceOn
      coveredThroughOn
      intervalMonths
      status
      color
      createdAt
      updatedAt
      templateEntries {
        amount
        kind
        ledgerAccount {
          id
          name
          kind
        }
      }
      occurrences {
        occurrenceOn
        outcome
        createdAt
        transaction {
          id
          date
          description
          entries {
            amount
            kind
          }
        }
      }
    }
  }
`)

export const CreateSubscriptionDoc = graphql(/* GraphQL */ `
  mutation CreateSubscription($input: CreateSubscriptionInput!) {
    createSubscription(input: $input) {
      id
      name
      registeredOn
      anchorOn
      nextOccurrenceOn
      coveredThroughOn
      intervalMonths
      status
      color
      createdAt
      updatedAt
      templateEntries {
        amount
        kind
        ledgerAccount {
          id
          name
          kind
        }
      }
    }
  }
`)

export const UpdateSubscriptionDoc = graphql(/* GraphQL */ `
  mutation UpdateSubscription($input: UpdateSubscriptionInput!) {
    updateSubscription(input: $input) {
      id
      name
      registeredOn
      anchorOn
      nextOccurrenceOn
      coveredThroughOn
      intervalMonths
      status
      color
      createdAt
      updatedAt
      templateEntries {
        amount
        kind
        ledgerAccount {
          id
          name
          kind
        }
      }
    }
  }
`)

export const PauseSubscriptionDoc = graphql(/* GraphQL */ `
  mutation PauseSubscription($id: ID!) {
    pauseSubscription(id: $id) {
      id
      status
      anchorOn
      nextOccurrenceOn
      coveredThroughOn
      updatedAt
    }
  }
`)

export const ResumeSubscriptionDoc = graphql(/* GraphQL */ `
  mutation ResumeSubscription($id: ID!) {
    resumeSubscription(id: $id) {
      id
      status
      anchorOn
      nextOccurrenceOn
      coveredThroughOn
      updatedAt
    }
  }
`)

export const CancelSubscriptionDoc = graphql(/* GraphQL */ `
  mutation CancelSubscription($id: ID!) {
    cancelSubscription(id: $id) {
      id
      status
      anchorOn
      nextOccurrenceOn
      coveredThroughOn
      updatedAt
    }
  }
`)

export const UncancelSubscriptionDoc = graphql(/* GraphQL */ `
  mutation UncancelSubscription($id: ID!) {
    uncancelSubscription(id: $id) {
      id
      status
      anchorOn
      nextOccurrenceOn
      coveredThroughOn
      updatedAt
    }
  }
`)
