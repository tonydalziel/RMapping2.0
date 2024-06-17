use deadpool_postgres::{Manager, ManagerConfig, Object, Pool, RecyclingMethod};
use log::{info, warn};
use postgres::config::SslMode;
use semver::Version;

use crate::pg::config::PgConfig;
use crate::pg::tls::{make_connector, parse_conn_str, SslModeOverride};
use crate::pg::PgError::{
    BadPostgisVersion, PostgisTooOld, PostgresError, PostgresPoolBuildError, PostgresPoolConnError,
};
use crate::pg::PgResult;

pub const POOL_SIZE_DEFAULT: usize = 20;

// We require ST_TileEnvelope that was added in PostGIS 3.0.0
// See https://postgis.net/docs/ST_TileEnvelope.html
const MINIMUM_POSTGIS_VER: Version = Version::new(3, 0, 0);
// After this version we can use margin parameter in ST_TileEnvelope
const RECOMMENDED_POSTGIS_VER: Version = Version::new(3, 1, 0);

#[derive(Clone, Debug)]
pub struct PgPool {
    id: String,
    pool: Pool,
    // When true, we can use margin parameter in ST_TileEnvelope
    margin: bool,
}

impl PgPool {
    pub async fn new(config: &PgConfig) -> PgResult<Self> {
        let (id, mgr) = Self::parse_config(config)?;

        let pool = Pool::builder(mgr)
            .max_size(config.pool_size.unwrap_or(POOL_SIZE_DEFAULT))
            .build()
            .map_err(|e| PostgresPoolBuildError(e, id.clone()))?;

        let version: String = get_conn(&pool, id.as_str())
            .await?
            .query_one(
                r"
SELECT
    (regexp_matches(
           PostGIS_Lib_Version(),
           '^(\d+\.\d+\.\d+)',
           'g'
    ))[1] as version;
                ",
                &[],
            )
            .await
            .map(|row| row.get("version"))
            .map_err(|e| PostgresError(e, "querying postgis version"))?;

        let version: Version = version.parse().map_err(|e| BadPostgisVersion(e, version))?;
        if version < MINIMUM_POSTGIS_VER {
            return Err(PostgisTooOld(version, MINIMUM_POSTGIS_VER));
        }
        if version < RECOMMENDED_POSTGIS_VER {
            warn!("PostGIS {version} is before the recommended {RECOMMENDED_POSTGIS_VER}. Margin parameter in ST_TileEnvelope is not supported, so tiles may be cut off at the edges.");
        }

        let margin = version >= RECOMMENDED_POSTGIS_VER;
        Ok(Self { id, pool, margin })
    }

    fn parse_config(config: &PgConfig) -> PgResult<(String, Manager)> {
        let conn_str = config.connection_string.as_ref().unwrap().as_str();
        let (pg_cfg, ssl_mode) = parse_conn_str(conn_str)?;

        let id = pg_cfg.get_dbname().map_or_else(
            || format!("{:?}", pg_cfg.get_hosts()[0]),
            ToString::to_string,
        );

        let mgr_config = ManagerConfig {
            recycling_method: RecyclingMethod::Fast,
        };

        let mgr = if pg_cfg.get_ssl_mode() == SslMode::Disable {
            info!("Connecting without SSL support: {pg_cfg:?}");
            let connector = deadpool_postgres::tokio_postgres::NoTls {};
            Manager::from_config(pg_cfg, connector, mgr_config)
        } else {
            match ssl_mode {
                SslModeOverride::Unmodified(_) => {
                    info!("Connecting with SSL support: {pg_cfg:?}");
                }
                SslModeOverride::VerifyCa => {
                    info!("Using sslmode=verify-ca to connect: {pg_cfg:?}");
                }
                SslModeOverride::VerifyFull => {
                    info!("Using sslmode=verify-full to connect: {pg_cfg:?}");
                }
            };
            let connector = make_connector(&config.ssl_certificates, ssl_mode)?;
            Manager::from_config(pg_cfg, connector, mgr_config)
        };

        Ok((id, mgr))
    }

    pub async fn get(&self) -> PgResult<Object> {
        get_conn(&self.pool, self.id.as_str()).await
    }

    #[must_use]
    pub fn get_id(&self) -> &str {
        self.id.as_str()
    }

    #[must_use]
    pub fn supports_tile_margin(&self) -> bool {
        self.margin
    }
}

async fn get_conn(pool: &Pool, id: &str) -> PgResult<Object> {
    pool.get()
        .await
        .map_err(|e| PostgresPoolConnError(e, id.to_string()))
}
