import React, { useState } from "react";
import TimeAgo from "javascript-time-ago";

import { Table, Space, Col, Row, Tooltip, ConfigProvider, Select, Typography } from "antd";
import { LaddersDataArrayObject, LaddersDataObject } from "../../coh/types";
import { ColumnsType } from "antd/lib/table";
import firebaseAnalytics from "../../analytics";
import {
  capitalize,
  convertDateToDayTimestamp,
  getYesterdayDateTimestamp,
  useQuery,
} from "../../helpers";
import { useFirestoreConnect } from "react-redux-firebase";
import { useData, useLoading } from "../../firebase";
import { findAndMergeStatGroups } from "./helpers";

import en from "javascript-time-ago/locale/en";
import { CountryFlag } from "../../components/country-flag";
import { leaderBoardsBase } from "../../titles";
import enGB from "antd/lib/locale/en_GB";
import DatePicker from "../../components/date-picker";
import { isAfter, isBefore } from "date-fns";
import { useHistory } from "react-router";
import routes from "../../routes";
import { getGeneralIconPath } from "../../coh/helpers";
import { Helper } from "../../components/helper";

const { Text } = Typography;

TimeAgo.addDefaultLocale(en);
const timeAgo = new TimeAgo("en-US");

const isTeamGame = (type: string) => {
  return !["1v1", "2v2", "3v3", "4v4"].includes(type);
};

const Leaderboards = () => {
  firebaseAnalytics.leaderboardsDisplayed();
  const { Option } = Select;

  const { push } = useHistory();
  const query = useQuery();
  const timestamp = query.get("timeStamp") || `${getYesterdayDateTimestamp()}`;
  const historicTimestamp =
    query.get("historicTimeStamp") || `${getYesterdayDateTimestamp() - 86400}`;
  const type = query.get("type") || "1v1";
  const race = query.get("race") || "soviet";

  const [selectedTimeStamp, setSelectedTimeStamp] = useState(timestamp);
  const [selectedHistoricTimeStamp, setHistoricTimeStamp] = useState(historicTimestamp);
  const [selectedType, setSelectedType] = useState(type);
  const [selectedRace, setSelectedRace] = useState(race);

  // Set page title
  document.title = `${leaderBoardsBase} - ${capitalize(selectedType)} - ${capitalize(
    selectedRace,
  )}`;

  const isLoadingData = useLoading("leaderboards");
  const isLoadingDataHistoric = useLoading("leaderboardsHistory");
  const data: LaddersDataObject = useData("leaderboards");
  const dataHistoric: LaddersDataObject = useData("leaderboardsHistory");

  useFirestoreConnect([
    {
      collection: "ladders",
      doc: selectedTimeStamp,
      subcollections: [
        {
          collection: selectedType,
          doc: selectedRace,
        },
      ],
      storeAs: "leaderboards",
    },
    {
      collection: "ladders",
      doc: selectedHistoricTimeStamp,
      subcollections: [
        {
          collection: selectedType,
          doc: selectedRace,
        },
      ],
      storeAs: "leaderboardsHistory",
    },
  ]);

  const divStyle = {
    backgroundImage: `url(${getGeneralIconPath(race)})`,
    backgroundRepeat: "no-repeat",
    backgroundSize: "350px",
    backgroundPosition: "left top 200px",
    backgroundBlendMode: "overlay",
    backgroundColor: "rgba(255,255,255,0.8)",
  };

  const changeLeaderBoardsRoute = (params: Record<string, any>) => {
    let { timeStampToLoad, typeToLoad, raceToLoad, historicTimeStampToLoad } = params;

    const searchValue = `?${new URLSearchParams({
      timeStamp: timeStampToLoad || selectedTimeStamp,
      type: typeToLoad || selectedType,
      race: raceToLoad || selectedRace,
      historicTimeStamp: historicTimeStampToLoad || selectedHistoricTimeStamp,
    })}`;

    push({
      pathname: routes.leaderboardsBase(),
      search: searchValue,
    });
  };

  const TableColumns: ColumnsType<LaddersDataArrayObject> = [
    {
      title: "Rank",
      dataIndex: "rank",
      key: "rank",
      align: "center" as "center",
      width: 20,
      sorter: (a: LaddersDataArrayObject, b: LaddersDataArrayObject) => a.rank - b.rank,
    },
    { title: "Level", dataIndex: "ranklevel", key: "ranklevel", align: "center" as "center" },
    {
      title: "Change",
      dataIndex: "change",
      key: "change",
      align: "center" as "center",
      width: 110,
      render: (data: any) => {
        if (data > 0) {
          return <div style={{ color: "green" }}>+{data}</div>;
        } else if (data < 0) {
          return <div style={{ color: "red" }}>{data}</div>;
        } else if (data === "new") {
          return "new";
        }
      },
      sorter: (a: LaddersDataArrayObject, b: LaddersDataArrayObject) => {
        if (Number.isInteger(a.change) && Number.isInteger(b.change)) {
          return (a.change as number) - (b.change as number);
        } else {
          return +1;
        }
      },
    },
    {
      title: "Alias",
      dataIndex: "members",
      key: "members",
      render: (data: any) => {
        return (
          <div>
            {data.map((playerInfo: Record<string, any>) => {
              return (
                <div key={playerInfo.profile_id}>
                  <CountryFlag
                    countryCode={playerInfo["country"]}
                    style={{ width: "1.2em", height: "1.2em", paddingRight: 0 }}
                  />{" "}
                  {playerInfo["alias"]}
                </div>
              );
            })}
          </div>
        );
      },
    },
    {
      title: "Streak",
      dataIndex: "streak",
      key: "streak",
      align: "center" as "center",
      sorter: (a: LaddersDataArrayObject, b: LaddersDataArrayObject) => a.streak - b.streak,
      render: (data: any) => {
        if (data > 0) {
          return <div style={{ color: "green" }}>+{data}</div>;
        } else {
          return <div style={{ color: "red" }}>{data}</div>;
        }
      },
    },
    {
      title: "Wins",
      dataIndex: "wins",
      key: "wins",
      align: "center" as "center",
      sorter: (a: LaddersDataArrayObject, b: LaddersDataArrayObject) => a.wins - b.wins,
    },
    {
      title: "Losses",
      dataIndex: "losses",
      key: "losses",
      align: "center" as "center",
      sorter: (a: LaddersDataArrayObject, b: LaddersDataArrayObject) => a.losses - b.losses,
    },
    {
      title: "Ratio",
      key: "ratio",
      align: "center" as "center",
      width: 20,
      sorter: (a: LaddersDataArrayObject, b: LaddersDataArrayObject) => {
        return (
          Math.round(100 * Number(a.wins / (a.losses + a.wins))) -
          Math.round(100 * Number(b.wins / (b.losses + b.wins)))
        );
      },
      render: (data: any) => {
        return <div>{Math.round(100 * Number(data.wins / (data.losses + data.wins)))}%</div>;
      },
    },
    {
      title: "Total",
      key: "total",
      align: "center" as "center",
      sorter: (a: LaddersDataArrayObject, b: LaddersDataArrayObject) => {
        return a.wins + a.losses - (b.wins + b.losses);
      },
      render: (data: any) => {
        return <>{data.wins + data.losses}</>;
      },
    },
    {
      title: "Drops",
      dataIndex: "drops",
      key: "drops",
      align: "center" as "center",
      width: 20,
      sorter: (a: LaddersDataArrayObject, b: LaddersDataArrayObject) => a.drops - b.drops,
    },
    {
      title: "Disputes",
      dataIndex: "disputes",
      key: "disputes",
      align: "center" as "center",
      sorter: (a: LaddersDataArrayObject, b: LaddersDataArrayObject) => a.disputes - b.disputes,
      width: 20,
    },
    {
      title: "Last Game",
      dataIndex: "lastmatchdate",
      key: "lastmatchdate",
      align: "right" as "right",
      width: 120,
      sorter: (a: LaddersDataArrayObject, b: LaddersDataArrayObject) =>
        a.lastmatchdate - b.lastmatchdate,
      render: (data: any) => {
        return (
          <Tooltip title={new Date(data * 1000).toLocaleString()}>
            {timeAgo.format(Date.now() - (Date.now() - data * 1000), "round-minute")}
          </Tooltip>
        );
      },
    },
  ];

  const disabledDate = (current: Date) => {
    // we started logging Monday 8.3.2021
    const canBeOld = isBefore(current, new Date(2021, 2, 8));
    const canBeNew = isAfter(current, new Date());

    return canBeOld || canBeNew;
  };

  const CustomDatePicker = ({
    onChange,
    defaultValue,
  }: {
    onChange: any;
    defaultValue: Date;
  }) => {
    return (
      <ConfigProvider locale={enGB}>
        <DatePicker
          onChange={onChange}
          allowClear={false}
          defaultValue={defaultValue}
          disabledDate={disabledDate}
          size={"large"}
        />
      </ConfigProvider>
    );
  };

  return (
    <>
      <div style={divStyle}>
        <Row justify="center" style={{ paddingTop: "20px" }}>
          <Col>
            <Space direction={"horizontal"}>
              <CustomDatePicker
                onChange={(value: any) => {
                  setSelectedTimeStamp(convertDateToDayTimestamp(`${value}`).toString());
                  changeLeaderBoardsRoute({
                    timeStampToLoad: convertDateToDayTimestamp(`${value}`),
                  });
                }}
                defaultValue={new Date(parseInt(selectedTimeStamp) * 1000)}
              />
              <Select
                value={selectedType}
                onChange={(value) => {
                  changeLeaderBoardsRoute({ typeToLoad: value });
                  setSelectedType(value);
                }}
                style={{ width: 120 }}
                size={"large"}
              >
                <Option value="1v1">1v1</Option>
                <Option value="2v2">2v2</Option>
                <Option value="3v3">3v3</Option>
                <Option value="4v4">4v4</Option>
                <Option value="team2">Team of 2</Option>
                <Option value="team3">Team of 3</Option>
                <Option value="team4">Team of 4</Option>
              </Select>
              <Select
                value={selectedRace}
                onChange={(value) => {
                  changeLeaderBoardsRoute({ raceToLoad: value });
                  setSelectedRace(value);
                }}
                style={{ width: 130 }}
                size={"large"}
              >
                {!isTeamGame(selectedType) ? (
                  <>
                    <Option value="wehrmacht">Wehrmacht</Option>
                    <Option value="wgerman">OKW</Option>
                    <Option value="soviet">Soviet</Option>
                    <Option value="usf">USF</Option>
                    <Option value="british">British</Option>
                  </>
                ) : (
                  <>
                    <Option value="axis">Axis</Option>
                    <Option value="allies">Allies</Option>
                  </>
                )}
              </Select>
              <div>
                in compare with{" "}
                <Helper
                  text={
                    <>
                      Change in rank in compare to rank standings on selected historic date.
                      <br />
                      <Text mark>new</Text> means the player was not in top 200 on the selected
                      historic date
                    </>
                  }
                />
              </div>
              <CustomDatePicker
                onChange={(value: any) => {
                  setHistoricTimeStamp(convertDateToDayTimestamp(`${value}`).toString());
                  changeLeaderBoardsRoute({
                    historicTimeStampToLoad: convertDateToDayTimestamp(`${value}`),
                  });
                  setSelectedTimeStamp(selectedTimeStamp);
                }}
                defaultValue={new Date(parseInt(selectedHistoricTimeStamp) * 1000)}
              />
            </Space>
          </Col>
        </Row>
        <Row justify="center" style={{ padding: "10px" }}>
          <Col xs={24} xxl={17}>
            <Table
              style={{ minHeight: 600 }}
              title={(value) => {
                return (
                  <div style={{ fontSize: "large", paddingBottom: 15 }}>
                    <span style={{ float: "left" }}>
                      {" "}
                      <Text strong>
                        {" "}
                        Leaderboards for {capitalize(selectedRace)} {selectedType}
                      </Text>{" "}
                      as of {`${new Date(parseInt(selectedTimeStamp) * 1000).toLocaleString()}`}{" "}
                      UTC
                    </span>
                    <span style={{ float: "right" }}>
                      <Text strong>{data?.rankTotal}</Text> ranked{" "}
                      {isTeamGame(selectedType) ? "teams" : "players"}
                    </span>
                  </div>
                );
              }}
              columns={TableColumns}
              pagination={{
                defaultPageSize: 40,
                pageSizeOptions: ["20", "40", "60", "100", "200"],
              }}
              rowKey={(record) => record?.rank}
              dataSource={findAndMergeStatGroups(data, dataHistoric)}
              loading={isLoadingData || isLoadingDataHistoric}
            />
          </Col>
        </Row>
      </div>
    </>
  );
};

export default Leaderboards;
