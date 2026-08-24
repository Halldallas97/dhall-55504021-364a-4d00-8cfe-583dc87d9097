import type { TaskStatus } from '@dhall-55504021-364a-4d00-8cfe-583dc87d9097/data';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { OrganizationEntity } from './organization.entity';
import { UserEntity } from './user.entity';

@Entity({ name: 'tasks' })
export class TaskEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', default: '' })
  description: string;

  @Column({
    type: 'simple-enum',
    enum: ['new', 'in-progress', 'done'] satisfies TaskStatus[],
    default: 'new',
  })
  status: TaskStatus;

  @Column({ name: 'organization_id', type: 'text' })
  organizationId: string;

  @ManyToOne(() => OrganizationEntity, (organization) => organization.tasks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organization_id' })
  organization: Relation<OrganizationEntity>;

  @Column({ name: 'created_by_user_id', type: 'text' })
  createdByUserId: string;

  @ManyToOne(() => UserEntity, (user) => user.createdTasks, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'created_by_user_id' })
  createdByUser: Relation<UserEntity>;

  @Column({ name: 'assignee_id', type: 'text', nullable: true })
  assigneeId: string | null;

  @ManyToOne(() => UserEntity, (user) => user.assignedTasks, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'assignee_id' })
  assignee: Relation<UserEntity> | null;
}
