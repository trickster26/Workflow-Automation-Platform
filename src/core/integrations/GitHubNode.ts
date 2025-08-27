import { INodeType, INodeExecuteFunctions } from '../NodeRegistry';
import { INodeTypeDescription } from '../../types/workflow.types';

// Define missing interfaces for now
interface IDataObject {
  [key: string]: any;
}

class NodeOperationError extends Error {
  constructor(node: any, message: string) {
    super(message);
    this.name = 'NodeOperationError';
  }
}
import { Octokit } from '@octokit/rest';

export class GitHubNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'GitHub',
    name: 'github',
    icon: 'file:github.svg',
    group: ['integration'],
    version: 1,
    subtitle: '={{$parameter["operation"]}}',
    description: 'Interact with GitHub repositories, issues, and pull requests',
    defaults: {
      name: 'GitHub',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'gitHubApi',
        required: true,
      },
    ],
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'Repository',
            value: 'repository',
          },
          {
            name: 'Issue',
            value: 'issue',
          },
          {
            name: 'Pull Request',
            value: 'pullRequest',
          },
          {
            name: 'Release',
            value: 'release',
          },
          {
            name: 'File',
            value: 'file',
          },
          {
            name: 'Search',
            value: 'search',
          },
          {
            name: 'User',
            value: 'user',
          },
          {
            name: 'Organization',
            value: 'organization',
          },
        ],
        default: 'repository',
      },

      // Repository Operations
      {
        displayName: 'Repository Operation',
        name: 'repositoryOperation',
        type: 'options',
        displayOptions: {
          show: {
            operation: ['repository'],
          },
        },
        options: [
          {
            name: 'Create',
            value: 'create',
            description: 'Create a new repository',
          },
          {
            name: 'Get',
            value: 'get',
            description: 'Get repository information',
          },
          {
            name: 'Update',
            value: 'update',
            description: 'Update repository settings',
          },
          {
            name: 'Delete',
            value: 'delete',
            description: 'Delete a repository',
          },
          {
            name: 'List',
            value: 'list',
            description: 'List repositories',
          },
          {
            name: 'Get Contributors',
            value: 'getContributors',
            description: 'Get repository contributors',
          },
          {
            name: 'Get Languages',
            value: 'getLanguages',
            description: 'Get repository languages',
          },
          {
            name: 'Fork',
            value: 'fork',
            description: 'Fork a repository',
          },
        ],
        default: 'get',
      },

      // Issue Operations
      {
        displayName: 'Issue Operation',
        name: 'issueOperation',
        type: 'options',
        displayOptions: {
          show: {
            operation: ['issue'],
          },
        },
        options: [
          {
            name: 'Create',
            value: 'create',
            description: 'Create a new issue',
          },
          {
            name: 'Get',
            value: 'get',
            description: 'Get an issue',
          },
          {
            name: 'Update',
            value: 'update',
            description: 'Update an issue',
          },
          {
            name: 'Close',
            value: 'close',
            description: 'Close an issue',
          },
          {
            name: 'List',
            value: 'list',
            description: 'List issues',
          },
          {
            name: 'Add Comment',
            value: 'addComment',
            description: 'Add comment to issue',
          },
          {
            name: 'List Comments',
            value: 'listComments',
            description: 'List issue comments',
          },
          {
            name: 'Add Label',
            value: 'addLabel',
            description: 'Add label to issue',
          },
          {
            name: 'Remove Label',
            value: 'removeLabel',
            description: 'Remove label from issue',
          },
        ],
        default: 'get',
      },

      // Pull Request Operations
      {
        displayName: 'Pull Request Operation',
        name: 'pullRequestOperation',
        type: 'options',
        displayOptions: {
          show: {
            operation: ['pullRequest'],
          },
        },
        options: [
          {
            name: 'Create',
            value: 'create',
            description: 'Create a new pull request',
          },
          {
            name: 'Get',
            value: 'get',
            description: 'Get a pull request',
          },
          {
            name: 'Update',
            value: 'update',
            description: 'Update a pull request',
          },
          {
            name: 'Merge',
            value: 'merge',
            description: 'Merge a pull request',
          },
          {
            name: 'Close',
            value: 'close',
            description: 'Close a pull request',
          },
          {
            name: 'List',
            value: 'list',
            description: 'List pull requests',
          },
          {
            name: 'List Files',
            value: 'listFiles',
            description: 'List files in pull request',
          },
          {
            name: 'Create Review',
            value: 'createReview',
            description: 'Create a pull request review',
          },
        ],
        default: 'get',
      },

      // Release Operations
      {
        displayName: 'Release Operation',
        name: 'releaseOperation',
        type: 'options',
        displayOptions: {
          show: {
            operation: ['release'],
          },
        },
        options: [
          {
            name: 'Create',
            value: 'create',
            description: 'Create a new release',
          },
          {
            name: 'Get',
            value: 'get',
            description: 'Get a release',
          },
          {
            name: 'Update',
            value: 'update',
            description: 'Update a release',
          },
          {
            name: 'Delete',
            value: 'delete',
            description: 'Delete a release',
          },
          {
            name: 'List',
            value: 'list',
            description: 'List releases',
          },
          {
            name: 'Get Latest',
            value: 'getLatest',
            description: 'Get latest release',
          },
        ],
        default: 'get',
      },

      // File Operations
      {
        displayName: 'File Operation',
        name: 'fileOperation',
        type: 'options',
        displayOptions: {
          show: {
            operation: ['file'],
          },
        },
        options: [
          {
            name: 'Get Content',
            value: 'getContent',
            description: 'Get file content',
          },
          {
            name: 'Create File',
            value: 'createFile',
            description: 'Create a new file',
          },
          {
            name: 'Update File',
            value: 'updateFile',
            description: 'Update an existing file',
          },
          {
            name: 'Delete File',
            value: 'deleteFile',
            description: 'Delete a file',
          },
          {
            name: 'List Directory',
            value: 'listDirectory',
            description: 'List directory contents',
          },
        ],
        default: 'getContent',
      },

      // Search Operations
      {
        displayName: 'Search Operation',
        name: 'searchOperation',
        type: 'options',
        displayOptions: {
          show: {
            operation: ['search'],
          },
        },
        options: [
          {
            name: 'Repositories',
            value: 'repositories',
            description: 'Search repositories',
          },
          {
            name: 'Issues',
            value: 'issues',
            description: 'Search issues',
          },
          {
            name: 'Code',
            value: 'code',
            description: 'Search code',
          },
          {
            name: 'Users',
            value: 'users',
            description: 'Search users',
          },
        ],
        default: 'repositories',
      },

      // Repository Name/Owner
      {
        displayName: 'Repository Owner',
        name: 'owner',
        type: 'string',
        required: true,
        displayOptions: {
          show: {
            operation: ['repository', 'issue', 'pullRequest', 'release', 'file'],
          },
        },
        default: '',
        description: 'Repository owner (username or organization)',
      },
      {
        displayName: 'Repository Name',
        name: 'repository',
        type: 'string',
        required: true,
        displayOptions: {
          show: {
            operation: ['repository', 'issue', 'pullRequest', 'release', 'file'],
          },
        },
        default: '',
        description: 'Repository name',
      },

      // Issue Number
      {
        displayName: 'Issue Number',
        name: 'issueNumber',
        type: 'number',
        required: true,
        displayOptions: {
          show: {
            operation: ['issue'],
            issueOperation: ['get', 'update', 'close', 'addComment', 'listComments', 'addLabel', 'removeLabel'],
          },
        },
        default: 1,
        description: 'Issue number',
      },

      // Pull Request Number
      {
        displayName: 'Pull Request Number',
        name: 'pullRequestNumber',
        type: 'number',
        required: true,
        displayOptions: {
          show: {
            operation: ['pullRequest'],
            pullRequestOperation: ['get', 'update', 'merge', 'close', 'listFiles', 'createReview'],
          },
        },
        default: 1,
        description: 'Pull request number',
      },

      // File Path
      {
        displayName: 'File Path',
        name: 'filePath',
        type: 'string',
        required: true,
        displayOptions: {
          show: {
            operation: ['file'],
          },
        },
        default: '',
        description: 'Path to the file in the repository',
      },

      // Search Query
      {
        displayName: 'Search Query',
        name: 'query',
        type: 'string',
        required: true,
        displayOptions: {
          show: {
            operation: ['search'],
          },
        },
        default: '',
        description: 'Search query',
      },

      // Additional Fields
      {
        displayName: 'Additional Fields',
        name: 'additionalFields',
        type: 'collection',
        placeholder: 'Add Field',
        default: {},
        options: [
          {
            displayName: 'Title',
            name: 'title',
            type: 'string',
            default: '',
            description: 'Title for issues, pull requests, or releases',
          },
          {
            displayName: 'Body',
            name: 'body',
            type: 'string',
            typeOptions: {
              rows: 4,
            },
            default: '',
            description: 'Body content for issues, pull requests, or releases',
          },
          {
            displayName: 'Labels',
            name: 'labels',
            type: 'string',
            default: '',
            description: 'Comma-separated list of labels',
          },
          {
            displayName: 'Assignees',
            name: 'assignees',
            type: 'string',
            default: '',
            description: 'Comma-separated list of assignees',
          },
          {
            displayName: 'State',
            name: 'state',
            type: 'options',
            options: [
              {
                name: 'Open',
                value: 'open',
              },
              {
                name: 'Closed',
                value: 'closed',
              },
              {
                name: 'All',
                value: 'all',
              },
            ],
            default: 'open',
            description: 'Issue or pull request state',
          },
          {
            displayName: 'Content',
            name: 'content',
            type: 'string',
            typeOptions: {
              rows: 6,
            },
            default: '',
            description: 'File content (base64 encoded for binary files)',
          },
          {
            displayName: 'Commit Message',
            name: 'message',
            type: 'string',
            default: '',
            description: 'Commit message for file operations',
          },
          {
            displayName: 'Branch',
            name: 'branch',
            type: 'string',
            default: 'main',
            description: 'Branch name',
          },
          {
            displayName: 'Tag Name',
            name: 'tag_name',
            type: 'string',
            default: '',
            description: 'Release tag name',
          },
          {
            displayName: 'Target Commitish',
            name: 'target_commitish',
            type: 'string',
            default: 'main',
            description: 'Commitish value for release',
          },
          {
            displayName: 'Draft',
            name: 'draft',
            type: 'boolean',
            default: false,
            description: 'Whether the release is a draft',
          },
          {
            displayName: 'Prerelease',
            name: 'prerelease',
            type: 'boolean',
            default: false,
            description: 'Whether the release is a prerelease',
          },
          {
            displayName: 'Base Branch',
            name: 'base',
            type: 'string',
            default: 'main',
            description: 'Base branch for pull request',
          },
          {
            displayName: 'Head Branch',
            name: 'head',
            type: 'string',
            default: '',
            description: 'Head branch for pull request',
          },
          {
            displayName: 'Merge Method',
            name: 'merge_method',
            type: 'options',
            options: [
              {
                name: 'Merge',
                value: 'merge',
              },
              {
                name: 'Squash',
                value: 'squash',
              },
              {
                name: 'Rebase',
                value: 'rebase',
              },
            ],
            default: 'merge',
            description: 'Merge method for pull request',
          },
          {
            displayName: 'Sort',
            name: 'sort',
            type: 'options',
            options: [
              {
                name: 'Created',
                value: 'created',
              },
              {
                name: 'Updated',
                value: 'updated',
              },
              {
                name: 'Comments',
                value: 'comments',
              },
            ],
            default: 'created',
            description: 'Sort order',
          },
          {
            displayName: 'Direction',
            name: 'direction',
            type: 'options',
            options: [
              {
                name: 'Ascending',
                value: 'asc',
              },
              {
                name: 'Descending',
                value: 'desc',
              },
            ],
            default: 'desc',
            description: 'Sort direction',
          },
          {
            displayName: 'Per Page',
            name: 'per_page',
            type: 'number',
            default: 30,
            description: 'Number of results per page',
          },
        ],
      },
    ],
  };

  async execute(this: INodeExecuteFunctions): Promise<any> {
    const items = this.getInputData();
    let returnData: IDataObject[] = [];

    const credentials = await this.getCredentials('gitHubApi');
    if (!credentials) {
      throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
    }

    const octokit = new Octokit({
      auth: credentials.token,
    });

    for (let i = 0; i < items.length; i++) {
      try {
        const operation = this.getNodeParameter('operation', i) as string;

        let responseData: any;

        switch (operation) {
          case 'repository':
            responseData = await this.handleRepositoryOperation(octokit, i);
            break;
          case 'issue':
            responseData = await this.handleIssueOperation(octokit, i);
            break;
          case 'pullRequest':
            responseData = await this.handlePullRequestOperation(octokit, i);
            break;
          case 'release':
            responseData = await this.handleReleaseOperation(octokit, i);
            break;
          case 'file':
            responseData = await this.handleFileOperation(octokit, i);
            break;
          case 'search':
            responseData = await this.handleSearchOperation(octokit, i);
            break;
          default:
            throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not known!`);
        }

        if (Array.isArray(responseData)) {
          returnData.push(...responseData);
        } else {
          returnData.push(responseData);
        }
      } catch (error: any) {
        if (this.continueOnFail()) {
          returnData.push({
            error: error.message,
            json: {},
            pairedItem: { item: i },
          });
          continue;
        }
        throw error;
      }
    }

    return [this.helpers.returnJsonArray(returnData)];
  }

  async handleRepositoryOperation(this: INodeExecuteFunctions, octokit: Octokit, itemIndex: number): Promise<any> {
    const repositoryOperation = this.getNodeParameter('repositoryOperation', itemIndex) as string;
    const owner = this.getNodeParameter('owner', itemIndex) as string;
    const repo = this.getNodeParameter('repository', itemIndex) as string;
    const additionalFields = this.getNodeParameter('additionalFields', itemIndex) as IDataObject;

    switch (repositoryOperation) {
      case 'create':
        return await octokit.rest.repos.createForAuthenticatedUser({
          name: repo,
          description: additionalFields.body as string,
          private: additionalFields.private as boolean || false,
        });

      case 'get':
        return await octokit.rest.repos.get({
          owner,
          repo,
        });

      case 'update':
        return await octokit.rest.repos.update({
          owner,
          repo,
          name: additionalFields.name as string || repo,
          description: additionalFields.body as string,
          private: additionalFields.private as boolean,
        });

      case 'delete':
        return await octokit.rest.repos.delete({
          owner,
          repo,
        });

      case 'list':
        return await octokit.rest.repos.listForAuthenticatedUser({
          sort: additionalFields.sort as any || 'created',
          direction: additionalFields.direction as any || 'desc',
          per_page: additionalFields.per_page as number || 30,
        });

      case 'getContributors':
        return await octokit.rest.repos.listContributors({
          owner,
          repo,
          per_page: additionalFields.per_page as number || 30,
        });

      case 'getLanguages':
        return await octokit.rest.repos.listLanguages({
          owner,
          repo,
        });

      case 'fork':
        return await octokit.rest.repos.createFork({
          owner,
          repo,
        });

      default:
        throw new NodeOperationError(this.getNode(), `The repository operation "${repositoryOperation}" is not known!`);
    }
  }

  async handleIssueOperation(this: INodeExecuteFunctions, octokit: Octokit, itemIndex: number): Promise<any> {
    const issueOperation = this.getNodeParameter('issueOperation', itemIndex) as string;
    const owner = this.getNodeParameter('owner', itemIndex) as string;
    const repo = this.getNodeParameter('repository', itemIndex) as string;
    const additionalFields = this.getNodeParameter('additionalFields', itemIndex) as IDataObject;

    switch (issueOperation) {
      case 'create':
        return await octokit.rest.issues.create({
          owner,
          repo,
          title: additionalFields.title as string,
          body: additionalFields.body as string,
          labels: additionalFields.labels ? (additionalFields.labels as string).split(',').map(l => l.trim()) : undefined,
          assignees: additionalFields.assignees ? (additionalFields.assignees as string).split(',').map(a => a.trim()) : undefined,
        });

      case 'get':
        const issueNumber = this.getNodeParameter('issueNumber', itemIndex) as number;
        return await octokit.rest.issues.get({
          owner,
          repo,
          issue_number: issueNumber,
        });

      case 'update':
        const updateIssueNumber = this.getNodeParameter('issueNumber', itemIndex) as number;
        return await octokit.rest.issues.update({
          owner,
          repo,
          issue_number: updateIssueNumber,
          title: additionalFields.title as string,
          body: additionalFields.body as string,
          state: additionalFields.state as any,
          labels: additionalFields.labels ? (additionalFields.labels as string).split(',').map(l => l.trim()) : undefined,
          assignees: additionalFields.assignees ? (additionalFields.assignees as string).split(',').map(a => a.trim()) : undefined,
        });

      case 'close':
        const closeIssueNumber = this.getNodeParameter('issueNumber', itemIndex) as number;
        return await octokit.rest.issues.update({
          owner,
          repo,
          issue_number: closeIssueNumber,
          state: 'closed',
        });

      case 'list':
        return await octokit.rest.issues.listForRepo({
          owner,
          repo,
          state: additionalFields.state as any || 'open',
          sort: additionalFields.sort as any || 'created',
          direction: additionalFields.direction as any || 'desc',
          per_page: additionalFields.per_page as number || 30,
        });

      case 'addComment':
        const commentIssueNumber = this.getNodeParameter('issueNumber', itemIndex) as number;
        return await octokit.rest.issues.createComment({
          owner,
          repo,
          issue_number: commentIssueNumber,
          body: additionalFields.body as string,
        });

      case 'listComments':
        const listCommentsIssueNumber = this.getNodeParameter('issueNumber', itemIndex) as number;
        return await octokit.rest.issues.listComments({
          owner,
          repo,
          issue_number: listCommentsIssueNumber,
          per_page: additionalFields.per_page as number || 30,
        });

      default:
        throw new NodeOperationError(this.getNode(), `The issue operation "${issueOperation}" is not known!`);
    }
  }

  async handlePullRequestOperation(this: INodeExecuteFunctions, octokit: Octokit, itemIndex: number): Promise<any> {
    const pullRequestOperation = this.getNodeParameter('pullRequestOperation', itemIndex) as string;
    const owner = this.getNodeParameter('owner', itemIndex) as string;
    const repo = this.getNodeParameter('repository', itemIndex) as string;
    const additionalFields = this.getNodeParameter('additionalFields', itemIndex) as IDataObject;

    switch (pullRequestOperation) {
      case 'create':
        return await octokit.rest.pulls.create({
          owner,
          repo,
          title: additionalFields.title as string,
          body: additionalFields.body as string,
          head: additionalFields.head as string,
          base: additionalFields.base as string || 'main',
        });

      case 'get':
        const pullNumber = this.getNodeParameter('pullRequestNumber', itemIndex) as number;
        return await octokit.rest.pulls.get({
          owner,
          repo,
          pull_number: pullNumber,
        });

      case 'update':
        const updatePullNumber = this.getNodeParameter('pullRequestNumber', itemIndex) as number;
        return await octokit.rest.pulls.update({
          owner,
          repo,
          pull_number: updatePullNumber,
          title: additionalFields.title as string,
          body: additionalFields.body as string,
          state: additionalFields.state as any,
        });

      case 'merge':
        const mergePullNumber = this.getNodeParameter('pullRequestNumber', itemIndex) as number;
        return await octokit.rest.pulls.merge({
          owner,
          repo,
          pull_number: mergePullNumber,
          merge_method: additionalFields.merge_method as any || 'merge',
        });

      case 'close':
        const closePullNumber = this.getNodeParameter('pullRequestNumber', itemIndex) as number;
        return await octokit.rest.pulls.update({
          owner,
          repo,
          pull_number: closePullNumber,
          state: 'closed',
        });

      case 'list':
        return await octokit.rest.pulls.list({
          owner,
          repo,
          state: additionalFields.state as any || 'open',
          sort: additionalFields.sort as any || 'created',
          direction: additionalFields.direction as any || 'desc',
          per_page: additionalFields.per_page as number || 30,
        });

      case 'listFiles':
        const listFilesPullNumber = this.getNodeParameter('pullRequestNumber', itemIndex) as number;
        return await octokit.rest.pulls.listFiles({
          owner,
          repo,
          pull_number: listFilesPullNumber,
        });

      case 'createReview':
        const reviewPullNumber = this.getNodeParameter('pullRequestNumber', itemIndex) as number;
        return await octokit.rest.pulls.createReview({
          owner,
          repo,
          pull_number: reviewPullNumber,
          body: additionalFields.body as string,
          event: additionalFields.event as any || 'COMMENT',
        });

      default:
        throw new NodeOperationError(this.getNode(), `The pull request operation "${pullRequestOperation}" is not known!`);
    }
  }

  async handleReleaseOperation(this: INodeExecuteFunctions, octokit: Octokit, itemIndex: number): Promise<any> {
    const releaseOperation = this.getNodeParameter('releaseOperation', itemIndex) as string;
    const owner = this.getNodeParameter('owner', itemIndex) as string;
    const repo = this.getNodeParameter('repository', itemIndex) as string;
    const additionalFields = this.getNodeParameter('additionalFields', itemIndex) as IDataObject;

    switch (releaseOperation) {
      case 'create':
        return await octokit.rest.repos.createRelease({
          owner,
          repo,
          tag_name: additionalFields.tag_name as string,
          name: additionalFields.title as string,
          body: additionalFields.body as string,
          draft: additionalFields.draft as boolean || false,
          prerelease: additionalFields.prerelease as boolean || false,
          target_commitish: additionalFields.target_commitish as string || 'main',
        });

      case 'get':
        const releaseId = this.getNodeParameter('releaseId', itemIndex) as number;
        return await octokit.rest.repos.getRelease({
          owner,
          repo,
          release_id: releaseId,
        });

      case 'getLatest':
        return await octokit.rest.repos.getLatestRelease({
          owner,
          repo,
        });

      case 'list':
        return await octokit.rest.repos.listReleases({
          owner,
          repo,
          per_page: additionalFields.per_page as number || 30,
        });

      default:
        throw new NodeOperationError(this.getNode(), `The release operation "${releaseOperation}" is not known!`);
    }
  }

  async handleFileOperation(this: INodeExecuteFunctions, octokit: Octokit, itemIndex: number): Promise<any> {
    const fileOperation = this.getNodeParameter('fileOperation', itemIndex) as string;
    const owner = this.getNodeParameter('owner', itemIndex) as string;
    const repo = this.getNodeParameter('repository', itemIndex) as string;
    const path = this.getNodeParameter('filePath', itemIndex) as string;
    const additionalFields = this.getNodeParameter('additionalFields', itemIndex) as IDataObject;

    switch (fileOperation) {
      case 'getContent':
        return await octokit.rest.repos.getContent({
          owner,
          repo,
          path,
          ref: additionalFields.branch as string,
        });

      case 'createFile':
        return await octokit.rest.repos.createOrUpdateFileContents({
          owner,
          repo,
          path,
          message: additionalFields.message as string || 'Create file',
          content: Buffer.from(additionalFields.content as string).toString('base64'),
          branch: additionalFields.branch as string,
        });

      case 'updateFile':
        const fileData = await octokit.rest.repos.getContent({
          owner,
          repo,
          path,
          ref: additionalFields.branch as string,
        });
        
        return await octokit.rest.repos.createOrUpdateFileContents({
          owner,
          repo,
          path,
          message: additionalFields.message as string || 'Update file',
          content: Buffer.from(additionalFields.content as string).toString('base64'),
          sha: (fileData.data as any).sha,
          branch: additionalFields.branch as string,
        });

      case 'deleteFile':
        const deleteFileData = await octokit.rest.repos.getContent({
          owner,
          repo,
          path,
          ref: additionalFields.branch as string,
        });
        
        return await octokit.rest.repos.deleteFile({
          owner,
          repo,
          path,
          message: additionalFields.message as string || 'Delete file',
          sha: (deleteFileData.data as any).sha,
          branch: additionalFields.branch as string,
        });

      case 'listDirectory':
        return await octokit.rest.repos.getContent({
          owner,
          repo,
          path,
          ref: additionalFields.branch as string,
        });

      default:
        throw new NodeOperationError(this.getNode(), `The file operation "${fileOperation}" is not known!`);
    }
  }

  async handleSearchOperation(this: INodeExecuteFunctions, octokit: Octokit, itemIndex: number): Promise<any> {
    const searchOperation = this.getNodeParameter('searchOperation', itemIndex) as string;
    const query = this.getNodeParameter('query', itemIndex) as string;
    const additionalFields = this.getNodeParameter('additionalFields', itemIndex) as IDataObject;

    switch (searchOperation) {
      case 'repositories':
        return await octokit.rest.search.repos({
          q: query,
          sort: additionalFields.sort as any,
          order: additionalFields.direction as any,
          per_page: additionalFields.per_page as number || 30,
        });

      case 'issues':
        return await octokit.rest.search.issuesAndPullRequests({
          q: query,
          sort: additionalFields.sort as any,
          order: additionalFields.direction as any,
          per_page: additionalFields.per_page as number || 30,
        });

      case 'code':
        return await octokit.rest.search.code({
          q: query,
          sort: additionalFields.sort as any,
          order: additionalFields.direction as any,
          per_page: additionalFields.per_page as number || 30,
        });

      case 'users':
        return await octokit.rest.search.users({
          q: query,
          sort: additionalFields.sort as any,
          order: additionalFields.direction as any,
          per_page: additionalFields.per_page as number || 30,
        });

      default:
        throw new NodeOperationError(this.getNode(), `The search operation "${searchOperation}" is not known!`);
    }
  }
}