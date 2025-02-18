import React, { useState, useCallback, useMemo } from 'react'
import {
  Form,
  Skeleton,
  Switch,
  Input,
  Space,
  Button,
  Modal,
  Select,
} from 'antd'
import { ExclamationCircleOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { TFunction } from 'i18next'
import { getValueFormat } from '@baurine/grafana-value-formats'

import client, {
  ErrorStrategy,
  ConprofContinuousProfilingConfig,
} from '@lib/client'
import { useClientRequest } from '@lib/utils/useClientRequest'
import { ErrorBar, InstanceSelect } from '@lib/components'
import { useIsWriteable } from '@lib/utils/store'

const ONE_DAY_SECONDS = 24 * 60 * 60
const RETENTION_SECONDS = [
  3 * ONE_DAY_SECONDS,
  5 * ONE_DAY_SECONDS,
  10 * ONE_DAY_SECONDS,
]

function translateSecToDay(seconds: number, t: TFunction) {
  // in our case, the seconds value must be the multiple of one day seconds
  if (seconds % ONE_DAY_SECONDS !== 0) {
    console.warn(`${seconds} is not the mulitple of one day seconds`)
  }
  const day = seconds / ONE_DAY_SECONDS
  return t('conprof.settings.profile_retention_duration_option', {
    d: day,
  })
}

interface Props {
  onClose: () => void
  onConfigUpdated: () => any
}

function ConProfSettingForm({ onClose, onConfigUpdated }: Props) {
  const [submitting, setSubmitting] = useState(false)
  const { t } = useTranslation()
  const isWriteable = useIsWriteable()

  const {
    data: initialConfig,
    isLoading: loading,
    error,
  } = useClientRequest(() =>
    client.getInstance().continuousProfilingConfigGet({
      errorStrategy: ErrorStrategy.Custom,
    })
  )

  const { data: estimateSize } = useClientRequest(() =>
    client.getInstance().continuousProfilingEstimateSizeGet({
      errorStrategy: ErrorStrategy.Custom,
    })
  )

  const dataRetentionSeconds = useMemo(() => {
    const curRetentionSec =
      initialConfig?.continuous_profiling?.data_retention_seconds
    if (
      curRetentionSec &&
      RETENTION_SECONDS.indexOf(curRetentionSec) === -1 &&
      // filter out the duration that is not multiple of ONE_DAY_SECONDS
      curRetentionSec % ONE_DAY_SECONDS === 0
    ) {
      return RETENTION_SECONDS.concat(curRetentionSec).sort()
    }
    return RETENTION_SECONDS
  }, [initialConfig])

  const handleSubmit = useCallback(
    (values) => {
      async function updateConfig(values) {
        const newConfig: ConprofContinuousProfilingConfig = {
          enable: values.enable,
          data_retention_seconds: values.data_retention_seconds,
        }
        try {
          setSubmitting(true)
          await client.getInstance().continuousProfilingConfigPost({
            continuous_profiling: newConfig,
          })
          onClose()
          onConfigUpdated()
        } finally {
          setSubmitting(false)
        }
      }

      if (!values.enable) {
        // confirm
        Modal.confirm({
          title: t('conprof.settings.close_feature'),
          icon: <ExclamationCircleOutlined />,
          content: t('conprof.settings.close_feature_confirm'),
          okText: t('conprof.settings.actions.close'),
          cancelText: t('conprof.settings.actions.cancel'),
          okButtonProps: { danger: true },
          onOk: () => updateConfig(values),
        })
      } else {
        updateConfig(values)
      }
    },
    [t, onClose, onConfigUpdated]
  )

  return (
    <>
      {error && <ErrorBar errors={[error]} />}
      {loading && <Skeleton active={true} paragraph={{ rows: 5 }} />}
      {!loading && initialConfig && (
        <Form
          layout="vertical"
          initialValues={initialConfig.continuous_profiling}
          onFinish={handleSubmit}
        >
          <Form.Item
            valuePropName="checked"
            label={t('conprof.settings.switch')}
            extra={t('conprof.settings.switch_tooltip')}
          >
            <Form.Item noStyle name="enable" valuePropName="checked">
              <Switch disabled={!isWriteable} />
            </Form.Item>
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prev, cur) => prev.enable !== cur.enable}
          >
            {({ getFieldValue }) =>
              getFieldValue('enable') && (
                <>
                  <Form.Item
                    label={t('conprof.settings.profile_targets')}
                    extra={t('conprof.settings.profile_targets_tooltip', {
                      n: estimateSize?.instance_count || '?',
                      size: estimateSize?.profile_size
                        ? getValueFormat('decbytes')(
                            estimateSize.profile_size,
                            0
                          )
                        : '?',
                    })}
                  >
                    <InstanceSelect
                      defaultSelectAll={true}
                      enableTiFlash={true}
                      disabled={true}
                      style={{ width: 200 }}
                    />
                  </Form.Item>

                  <Form.Item
                    label={t('conprof.settings.profile_retention_duration')}
                    extra={t(
                      'conprof.settings.profile_retention_duration_tooltip'
                    )}
                  >
                    <Input.Group>
                      <Form.Item noStyle name="data_retention_seconds">
                        <Select style={{ width: 180 }}>
                          {dataRetentionSeconds.map((val) => (
                            <Select.Option key={val} value={val}>
                              {translateSecToDay(val, t)}
                            </Select.Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Input.Group>
                  </Form.Item>
                </>
              )
            }
          </Form.Item>
          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
                disabled={!isWriteable}
              >
                {t('statement.settings.actions.save')}
              </Button>
              <Button onClick={onClose}>
                {t('statement.settings.actions.cancel')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      )}
    </>
  )
}

export default ConProfSettingForm
