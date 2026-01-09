package com.teamsservice.mapper;

import com.teamsservice.dto.TeamResponse;
import com.teamsservice.entity.Team;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface TeamMapper {

    @Mapping(target = "logoUrl", source = "logoPath")
    @Mapping(target = "memberCount", ignore = true)
    TeamResponse toResponse(Team team);
}
