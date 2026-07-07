FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY SmartEPR.Core/SmartEPR.Core.csproj SmartEPR.Core/
COPY SmartEPR.Infrastructure/SmartEPR.Infrastructure.csproj SmartEPR.Infrastructure/
COPY SmartEPR.Api/SmartEPR.Api.csproj SmartEPR.Api/

RUN dotnet restore SmartEPR.Api/SmartEPR.Api.csproj

COPY . .

RUN dotnet publish SmartEPR.Api/SmartEPR.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
EXPOSE 8080

ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

COPY --from=build /app/publish .

ENTRYPOINT ["dotnet", "SmartEPR.Api.dll"]
