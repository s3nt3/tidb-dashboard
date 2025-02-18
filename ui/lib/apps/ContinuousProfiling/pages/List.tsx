import {
  Badge,
  Tooltip,
  Space,
  Drawer,
  Result,
  Button,
  Alert,
  Form,
} from 'antd'
import { ScrollablePane } from 'office-ui-fabric-react/lib/ScrollablePane'
import React, { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { usePersistFn, useSessionStorageState } from 'ahooks'
import {
  LoadingOutlined,
  ReloadOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'

import client, { ErrorStrategy } from '@lib/client'
import { Card, CardTable, Toolbar, DatePicker } from '@lib/components'
import DateTime from '@lib/components/DateTime'
import openLink from '@lib/utils/openLink'
import { useClientRequest } from '@lib/utils/useClientRequest'
import { InstanceKindName } from '@lib/utils/instanceTable'

import ConProfSettingForm from './ConProfSettingForm'

import styles from './List.module.less'

export default function Page() {
  const [endTime, setEndTime] = useSessionStorageState<Dayjs | string>(
    'conprof.end_time',
    ''
  )
  const rangeEndTime: Dayjs | undefined = useMemo(() => {
    let _rangeEndTime: Dayjs | undefined
    if (typeof endTime === 'string') {
      if (endTime === '') {
        _rangeEndTime = undefined
      } else {
        _rangeEndTime = dayjs(endTime)
      }
    } else {
      _rangeEndTime = endTime
    }
    return _rangeEndTime
  }, [endTime])

  const {
    data: historyTable,
    isLoading: listLoading,
    error: historyError,
    sendRequest: reloadGroupProfiles,
  } = useClientRequest(() => {
    let _rangeEndTime: Dayjs
    if (rangeEndTime === undefined) {
      _rangeEndTime = dayjs()
    } else {
      _rangeEndTime = rangeEndTime
    }
    const _rangeStartTime = _rangeEndTime.subtract(2, 'h')

    return client
      .getInstance()
      .continuousProfilingGroupProfilesGet(
        _rangeStartTime.unix(),
        _rangeEndTime.unix(),
        {
          errorStrategy: ErrorStrategy.Custom,
        }
      )
  })

  const { t } = useTranslation()
  const navigate = useNavigate()

  const handleRowClick = usePersistFn(
    (rec, _idx, ev: React.MouseEvent<HTMLElement>) => {
      openLink(`/continuous_profiling/detail?ts=${rec.ts}`, ev, navigate)
    }
  )

  const historyTableColumns = useMemo(
    () => [
      {
        name: t('conprof.list.table.columns.targets'),
        key: 'targets',
        minWidth: 150,
        maxWidth: 250,
        onRender: (rec) => {
          const { tikv, tidb, pd, tiflash } = rec.component_num
          const s = `${tikv} ${InstanceKindName['tikv']}, ${tidb} ${InstanceKindName['tidb']}, ${pd} ${InstanceKindName['pd']}, ${tiflash} ${InstanceKindName['tiflash']}`
          return <span>{s}</span>
        },
      },
      {
        name: t('conprof.list.table.columns.status'),
        key: 'status',
        minWidth: 100,
        maxWidth: 150,
        onRender: (rec) => {
          if (rec.state === 'running') {
            return (
              <Badge
                status="processing"
                text={t('conprof.list.table.status.running')}
              />
            )
          }
          if (rec.state === 'finished' || rec.state === 'success') {
            // all success
            return (
              <Badge
                status="success"
                text={t('conprof.list.table.status.finished')}
              />
            )
          }
          if (
            rec.state === 'finished_with_error' ||
            rec.state === 'partial failed'
          ) {
            // partial failed
            return (
              <Badge
                status="warning"
                text={t('conprof.list.table.status.partial_finished')}
              />
            )
          }
          if (rec.state === 'failed') {
            // all failed
            return (
              <Badge
                status="error"
                text={t('conprof.list.table.status.failed')}
              />
            )
          }
          return <Badge text={t('conprof.list.table.status.unknown')} />
        },
      },
      {
        name: t('conprof.list.table.columns.start_at'),
        key: 'ts',
        minWidth: 160,
        maxWidth: 220,
        onRender: (rec) => {
          return <DateTime.Long unixTimestampMs={rec.ts * 1000} />
        },
      },
      {
        name: t('conprof.list.table.columns.duration'),
        key: 'duration',
        minWidth: 100,
        maxWidth: 150,
        fieldName: 'profile_duration_secs',
      },
    ],
    [t]
  )

  const [showSettings, setShowSettings] = useState(false)

  const { data: ngMonitoringConfig, sendRequest: reloadConfig } =
    useClientRequest((reqConfig) =>
      client.getInstance().continuousProfilingConfigGet(reqConfig)
    )
  const conprofIsDisabled = useMemo(
    () => ngMonitoringConfig?.continuous_profiling?.enable === false,
    [ngMonitoringConfig]
  )

  function refresh() {
    reloadConfig()
    reloadGroupProfiles()
  }

  function handleFinish(fieldsValues) {
    setEndTime(fieldsValues['rangeEndTime'] || '')
    setTimeout(() => {
      reloadGroupProfiles()
    }, 0)
  }

  return (
    <div className={styles.list_container}>
      <Card>
        <Toolbar className={styles.list_toolbar}>
          <Space>
            <Form
              layout="inline"
              onFinish={handleFinish}
              initialValues={{ rangeEndTime }}
            >
              <Form.Item
                name="rangeEndTime"
                label={t('conprof.list.toolbar.range_end')}
              >
                <DatePicker showTime disabled={conprofIsDisabled} />
              </Form.Item>
              <Form.Item label={t('conprof.list.toolbar.range_duration')}>
                <span>-2h</span>
              </Form.Item>
              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={listLoading}
                  disabled={conprofIsDisabled}
                >
                  {t('conprof.list.toolbar.query')}
                </Button>
              </Form.Item>
            </Form>
          </Space>
          <Space>
            <Tooltip
              title={t('conprof.list.toolbar.refresh')}
              placement="bottom"
            >
              {listLoading ? (
                <LoadingOutlined />
              ) : (
                <ReloadOutlined onClick={refresh} />
              )}
            </Tooltip>
            <Tooltip
              title={t('conprof.list.toolbar.settings')}
              placement="bottom"
            >
              <SettingOutlined onClick={() => setShowSettings(true)} />
            </Tooltip>
          </Space>
        </Toolbar>
      </Card>

      {conprofIsDisabled && historyTable && historyTable.length > 0 && (
        <div className={styles.alert_container}>
          <Alert
            message={t('conprof.settings.disabled_with_history')}
            type="info"
            showIcon
          />
        </div>
      )}

      {conprofIsDisabled && historyTable?.length === 0 ? (
        <Result
          title={t('conprof.settings.disabled_result.title')}
          subTitle={t('conprof.settings.disabled_result.sub_title')}
          extra={
            <Button type="primary" onClick={() => setShowSettings(true)}>
              {t('conprof.settings.open_settings')}
            </Button>
          }
        />
      ) : (
        <div style={{ height: '100%', position: 'relative' }}>
          <ScrollablePane>
            <CardTable
              cardNoMarginTop
              loading={listLoading}
              items={historyTable || []}
              columns={historyTableColumns}
              errors={[historyError]}
              onRowClicked={handleRowClick}
            />
          </ScrollablePane>
        </div>
      )}

      <Drawer
        title={t('conprof.settings.title')}
        width={300}
        closable={true}
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        destroyOnClose={true}
      >
        <ConProfSettingForm
          onClose={() => setShowSettings(false)}
          onConfigUpdated={reloadConfig}
        />
      </Drawer>
    </div>
  )
}
