// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package pdtopo

import (
	"context"

	"go.etcd.io/etcd/clientv3"

	"github.com/pingcap/tidb-dashboard/util/client/pdclient"
	"github.com/pingcap/tidb-dashboard/util/topo"
)

// TopologyFromPD provides the topology information from PD.
type TopologyFromPD struct {
	etcdClient *clientv3.Client
	pdAPI      *pdclient.APIClient
}

var _ topo.TopologyProvider = (*TopologyFromPD)(nil)

func NewTopologyProviderFromPD(etcdClient *clientv3.Client, pdAPI *pdclient.APIClient) *TopologyFromPD {
	return &TopologyFromPD{
		etcdClient: etcdClient,
		pdAPI:      pdAPI,
	}
}

func (p *TopologyFromPD) GetPD(ctx context.Context) ([]topo.PDInfo, error) {
	return GetPDInstances(ctx, p.pdAPI)
}

func (p *TopologyFromPD) GetTiDB(ctx context.Context) ([]topo.TiDBInfo, error) {
	return GetTiDBInstances(ctx, p.etcdClient)
}

func (p *TopologyFromPD) GetTiKV(ctx context.Context) ([]topo.TiKVStoreInfo, error) {
	tikvStores, _, err := GetStoreInstances(ctx, p.pdAPI)
	if err != nil {
		return nil, err
	}
	return tikvStores, nil
}

func (p *TopologyFromPD) GetTiFlash(ctx context.Context) ([]topo.TiFlashStoreInfo, error) {
	_, tiFlashStores, err := GetStoreInstances(ctx, p.pdAPI)
	if err != nil {
		return nil, err
	}
	return tiFlashStores, nil
}

func (p *TopologyFromPD) GetPrometheus(ctx context.Context) (*topo.PrometheusInfo, error) {
	return GetPrometheusInstance(ctx, p.etcdClient)
}

func (p *TopologyFromPD) GetGrafana(ctx context.Context) (*topo.GrafanaInfo, error) {
	return GetGrafanaInstance(ctx, p.etcdClient)
}

func (p *TopologyFromPD) GetAlertManager(ctx context.Context) (*topo.AlertManagerInfo, error) {
	return GetAlertManagerInstance(ctx, p.etcdClient)
}
